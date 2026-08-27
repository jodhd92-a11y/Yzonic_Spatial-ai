//! OAuth routes — port of `google.strategy.ts` + `github.strategy.ts` +
//! `oauth.guard.ts` + the `finishOAuth`/`handleOAuthLogin` flow in
//! `auth.controller.ts` / `auth.service.ts`.
//!
//! Structural difference from every other route in this crate: OAuth
//! callbacks are a BROWSER redirect flow, not a JSON API — matching the
//! gateway's own comment ("this is a browser flow, not a JSON API"). Any
//! failure anywhere in the callback (network error, missing email,
//! CSRF-state mismatch, DB error) must redirect to
//! `{FRONTEND_URL}/login?error=oauth_failed`, exactly like the gateway's
//! `finishOAuth` catches everything and redirects rather than returning a
//! JSON error body. `AppError`/its JSON `IntoResponse` impl from
//! `routes::auth` is NOT used here for that reason — see `oauth_result`
//! below.
//!
//! DELIBERATE IMPROVEMENT over the reference implementation (flagged
//! per AGENTS.md — not a silent deviation): this adds CSRF `state`
//! parameter protection on both providers. The gateway's passport
//! strategies are constructed without `state: true`, so the reference
//! implementation has no CSRF protection on the OAuth flow at all —
//! that's a real, known class of vulnerability (login CSRF), not a
//! stylistic choice worth replicating. `oauth:state:<token>` is stored
//! in Redis with a short TTL and consumed exactly once on callback.
//! Because Redis is required for this protection to mean anything, OAuth
//! routes hard-503 if Redis is unavailable, rather than silently
//! degrading to an unprotected flow.

use axum::extract::{ConnectInfo, Query, State};
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use super::auth::{audit, db_error, issue_token_pair, request_meta, set_cookies_response, user_json, AppError, RequestMeta};
use crate::state::AppState;

const OAUTH_STATE_TTL_SECONDS: i64 = 10 * 60;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/oauth/google", get(google_start))
        .route("/auth/oauth/google/callback", get(google_callback))
        .route("/auth/oauth/github", get(github_start))
        .route("/auth/oauth/github/callback", get(github_callback))
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
}

/// A normalized identity, regardless of provider — matches
/// `OAuthProfile` exactly.
struct OAuthProfile {
    provider: &'static str, // "GOOGLE" | "GITHUB"
    provider_account_id: String,
    email: String,
    name: Option<String>,
    avatar_url: Option<String>,
}

// ---------- shared: redirect helpers ----------

fn redirect_to(url: &str) -> Response {
    let mut response = StatusCode::FOUND.into_response();
    if let Ok(v) = HeaderValue::from_str(url) {
        response.headers_mut().insert(header::LOCATION, v);
    }
    response
}

fn oauth_failed_redirect(state: &AppState) -> Response {
    redirect_to(&format!("{}/login?error=oauth_failed", state.config.frontend_url))
}

/// Every internal step in a callback returns `Result<Response, AppError>`
/// for convenient use of `?`, but the OUTER handler always collapses any
/// `Err` into the same `oauth_failed` redirect rather than a JSON error —
/// matching `finishOAuth`'s catch-all. `AppError`'s specific variant/
/// message is only used for `tracing::warn!` — never shown to the browser.
async fn oauth_result(state: &AppState, result: Result<Response, AppError>) -> Response {
    match result {
        Ok(response) => response,
        Err(_) => {
            tracing::warn!("OAuth callback failed — redirecting to login with error param");
            oauth_failed_redirect(state)
        }
    }
}

// ---------- shared: CSRF state ----------

async fn generate_and_store_state(state: &AppState) -> Result<String, AppError> {
    let redis = state.redis.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let token = engine_auth::tokens::generate_opaque_token();
    redis
        .set_ex(&format!("oauth:state:{token}"), "1", OAUTH_STATE_TTL_SECONDS)
        .await
        .map_err(|_| AppError::ServiceUnavailable)?;
    Ok(token)
}

/// One-time use: atomically fetches AND deletes the state token in a
/// single Redis round-trip (`GETDEL`), so a captured/replayed callback
/// URL can't be reused, and two concurrent requests presenting the same
/// token can't both slip through a check-then-delete race.
async fn consume_state(state: &AppState, token: &str) -> Result<(), AppError> {
    let redis = state.redis.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let key = format!("oauth:state:{token}");
    let existed = redis.get_del(&key).await.unwrap_or(None).is_some();
    if !existed {
        return Err(AppError::Unauthorized("Invalid or expired OAuth state.".into()));
    }
    Ok(())
}

// ---------- shared: account linking (matches AuthService.handleOAuthLogin) ----------

async fn handle_oauth_login(
    state: &AppState,
    profile: OAuthProfile,
    meta: &RequestMeta,
) -> Result<Response, AppError> {
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;

    let existing_user_id =
        engine_data::find_oauth_account_user_id(pool, profile.provider, &profile.provider_account_id)
            .await
            .map_err(db_error)?;

    let mut user = match existing_user_id {
        Some(user_id) => engine_data::get_user_with_password_by_id(pool, &user_id)
            .await
            .map_err(db_error)?
            .ok_or(AppError::Internal)?,
        None => {
            // No linked account yet — link by email if an account with
            // this email already exists, otherwise create a brand-new
            // OAuth-only user (no password).
            let user = match engine_data::get_user_by_email(pool, &profile.email)
                .await
                .map_err(db_error)?
            {
                Some(existing) => existing,
                None => {
                    let id = crate::ids::generate_id();
                    engine_data::create_oauth_user(
                        pool,
                        &id,
                        &profile.email,
                        profile.name.as_deref(),
                        profile.avatar_url.as_deref(),
                    )
                    .await
                    .map_err(db_error)?
                }
            };

            let account_id = crate::ids::generate_id();
            engine_data::create_oauth_account(pool, &account_id, profile.provider, &profile.provider_account_id, &user.id)
                .await
                .map_err(db_error)?;

            user
        }
    };

    if user.email_verified.is_none() {
        user = engine_data::mark_email_verified(pool, &user.id)
            .await
            .map_err(db_error)?;
    }

    let tokens = issue_token_pair(state, &user.id, &user.email, meta).await?;
    audit(
        state,
        "OAUTH_LOGIN",
        Some(&user.id),
        meta,
        Some(serde_json::json!({ "provider": profile.provider })),
    )
    .await;

    let body = serde_json::json!({ "user": user_json(user.into_public()) });
    let response = set_cookies_response(state, &tokens, body);

    // The gateway's finishOAuth does NOT return this JSON body — it
    // redirects to `${FRONTEND_URL}/` with the cookies attached. Reuse
    // set_cookies_response purely to get the correctly-flagged Set-Cookie
    // headers built, then swap the body/status for a redirect.
    let mut redirect = redirect_to(&format!("{}/", state.config.frontend_url));
    for value in response.headers().get_all(header::SET_COOKIE).iter() {
        redirect.headers_mut().append(header::SET_COOKIE, value.clone());
    }
    Ok(redirect)
}

// ---------- Google ----------

async fn google_start(State(state): State<Arc<AppState>>) -> Response {
    if !state.config.google_configured() {
        return (StatusCode::NOT_IMPLEMENTED, "Google sign-in is not configured yet.").into_response();
    }
    let Some(client_id) = &state.config.google_client_id else {
        return (StatusCode::NOT_IMPLEMENTED, "Google sign-in is not configured yet.").into_response();
    };
    let Some(callback_url) = &state.config.google_callback_url else {
        return (StatusCode::NOT_IMPLEMENTED, "Google sign-in is not configured yet.").into_response();
    };

    let csrf_state = match generate_and_store_state(&state).await {
        Ok(s) => s,
        Err(_) => return oauth_failed_redirect(&state),
    };

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}",
        urlencoding::encode(client_id),
        urlencoding::encode(callback_url),
        urlencoding::encode("profile email"),
        urlencoding::encode(&csrf_state),
    );
    redirect_to(&url)
}

async fn google_callback(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
    Query(query): Query<CallbackQuery>,
) -> Response {
    let meta = request_meta(&ConnectInfo(addr), &headers);
    let result = google_callback_inner(&state, query, &meta).await;
    oauth_result(&state, result).await
}

async fn google_callback_inner(
    state: &AppState,
    query: CallbackQuery,
    meta: &RequestMeta,
) -> Result<Response, AppError> {
    let code = query.code.ok_or(AppError::Unauthorized("Missing code.".into()))?;
    let csrf_state = query.state.ok_or(AppError::Unauthorized("Missing state.".into()))?;
    consume_state(state, &csrf_state).await?;

    let client_id = state.config.google_client_id.as_deref().ok_or(AppError::ServiceUnavailable)?;
    let client_secret = state.config.google_client_secret.as_deref().ok_or(AppError::ServiceUnavailable)?;
    let callback_url = state.config.google_callback_url.as_deref().ok_or(AppError::ServiceUnavailable)?;

    let mut form = HashMap::new();
    form.insert("client_id", client_id);
    form.insert("client_secret", client_secret);
    form.insert("code", code.as_str());
    form.insert("redirect_uri", callback_url);
    form.insert("grant_type", "authorization_code");

    let token_resp: serde_json::Value = state
        .http
        .post("https://oauth2.googleapis.com/token")
        .form(&form)
        .send()
        .await
        .map_err(|_| AppError::Internal)?
        .json()
        .await
        .map_err(|_| AppError::Internal)?;

    let access_token = token_resp
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or(AppError::Internal)?;

    let userinfo: serde_json::Value = state
        .http
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| AppError::Internal)?
        .json()
        .await
        .map_err(|_| AppError::Internal)?;

    // Normalized even though Google already lowercases — don't assume
    // every provider does; the account-linking lookup below needs this
    // to match whatever case the user's password-based account (if any)
    // was normalized to at signup.
    let email = engine_auth::normalize_email(
        userinfo
            .get("email")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::BadRequest("Google account has no accessible email.".into()))?,
    );
    let provider_account_id = userinfo
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or(AppError::Internal)?
        .to_string();
    let name = userinfo.get("name").and_then(|v| v.as_str()).map(|s| s.to_string());
    let avatar_url = userinfo.get("picture").and_then(|v| v.as_str()).map(|s| s.to_string());

    let profile = OAuthProfile {
        provider: "GOOGLE",
        provider_account_id,
        email,
        name,
        avatar_url,
    };

    handle_oauth_login(state, profile, meta).await
}

// ---------- GitHub ----------

async fn github_start(State(state): State<Arc<AppState>>) -> Response {
    if !state.config.github_configured() {
        return (StatusCode::NOT_IMPLEMENTED, "GitHub sign-in is not configured yet.").into_response();
    }
    let Some(client_id) = &state.config.github_client_id else {
        return (StatusCode::NOT_IMPLEMENTED, "GitHub sign-in is not configured yet.").into_response();
    };
    let Some(callback_url) = &state.config.github_callback_url else {
        return (StatusCode::NOT_IMPLEMENTED, "GitHub sign-in is not configured yet.").into_response();
    };

    let csrf_state = match generate_and_store_state(&state).await {
        Ok(s) => s,
        Err(_) => return oauth_failed_redirect(&state),
    };

    let url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope={}&state={}",
        urlencoding::encode(client_id),
        urlencoding::encode(callback_url),
        urlencoding::encode("user:email"),
        urlencoding::encode(&csrf_state),
    );
    redirect_to(&url)
}

async fn github_callback(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
    Query(query): Query<CallbackQuery>,
) -> Response {
    let meta = request_meta(&ConnectInfo(addr), &headers);
    let result = github_callback_inner(&state, query, &meta).await;
    oauth_result(&state, result).await
}

async fn github_callback_inner(
    state: &AppState,
    query: CallbackQuery,
    meta: &RequestMeta,
) -> Result<Response, AppError> {
    let code = query.code.ok_or(AppError::Unauthorized("Missing code.".into()))?;
    let csrf_state = query.state.ok_or(AppError::Unauthorized("Missing state.".into()))?;
    consume_state(state, &csrf_state).await?;

    let client_id = state.config.github_client_id.as_deref().ok_or(AppError::ServiceUnavailable)?;
    let client_secret = state.config.github_client_secret.as_deref().ok_or(AppError::ServiceUnavailable)?;
    let callback_url = state.config.github_callback_url.as_deref().ok_or(AppError::ServiceUnavailable)?;

    let mut form = HashMap::new();
    form.insert("client_id", client_id);
    form.insert("client_secret", client_secret);
    form.insert("code", code.as_str());
    form.insert("redirect_uri", callback_url);

    let token_resp: serde_json::Value = state
        .http
        .post("https://github.com/login/oauth/access_token")
        .header(header::ACCEPT, "application/json")
        .form(&form)
        .send()
        .await
        .map_err(|_| AppError::Internal)?
        .json()
        .await
        .map_err(|_| AppError::Internal)?;

    let access_token = token_resp
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or(AppError::Internal)?;

    // GitHub REQUIRES a User-Agent header on every API request or it
    // returns 403 — easy to miss, called out explicitly here.
    let profile_resp: serde_json::Value = state
        .http
        .get("https://api.github.com/user")
        .bearer_auth(access_token)
        .header(header::USER_AGENT, "web-os-engine")
        .send()
        .await
        .map_err(|_| AppError::Internal)?
        .json()
        .await
        .map_err(|_| AppError::Internal)?;

    let provider_account_id = profile_resp
        .get("id")
        .map(|v| v.to_string()) // GitHub's `id` is a JSON number; stringify it — providerAccountId is TEXT
        .ok_or(AppError::Internal)?;
    let name = profile_resp
        .get("name")
        .and_then(|v| v.as_str())
        .or_else(|| profile_resp.get("login").and_then(|v| v.as_str()))
        .map(|s| s.to_string());
    let avatar_url = profile_resp
        .get("avatar_url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // GitHub's /user endpoint only includes `email` if it's public.
    // Matches passport-github2 + the `user:email` scope: fetch
    // /user/emails and pick the primary+verified address — the accurate
    // equivalent of what the original relies on the library for, not a
    // guess at its exact internal algorithm.
    let emails_resp: Vec<serde_json::Value> = state
        .http
        .get("https://api.github.com/user/emails")
        .bearer_auth(access_token)
        .header(header::USER_AGENT, "web-os-engine")
        .send()
        .await
        .map_err(|_| AppError::Internal)?
        .json()
        .await
        .unwrap_or_default();

    // Normalized — GitHub usernames/emails aren't guaranteed lowercase
    // the way Google's are, and this must match whatever case any
    // existing password-based account was normalized to at signup.
    let email = engine_auth::normalize_email(
        emails_resp
            .iter()
            .find(|e| e.get("primary").and_then(|v| v.as_bool()) == Some(true) && e.get("verified").and_then(|v| v.as_bool()) == Some(true))
            .or_else(|| emails_resp.iter().find(|e| e.get("verified").and_then(|v| v.as_bool()) == Some(true)))
            .and_then(|e| e.get("email"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| {
                AppError::BadRequest(
                    "GitHub account has no accessible email. Make an email public on GitHub and try again.".into(),
                )
            })?,
    );

    let profile = OAuthProfile {
        provider: "GITHUB",
        provider_account_id,
        email,
        name,
        avatar_url,
    };

    handle_oauth_login(state, profile, meta).await
}
