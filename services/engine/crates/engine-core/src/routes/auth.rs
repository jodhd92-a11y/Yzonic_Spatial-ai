//! Faithful port of `auth.controller.ts` + `auth.service.ts` +
//! `otp.service.ts`. Route-by-route, this mirrors the real control flow
//! (including exact error messages and status codes) rather than
//! reimplementing the behavior from the openapi contract description —
//! the contract was written FROM this code, so this file is the more
//! authoritative of the two if they ever disagree.
//!
//! NOT ported in this slice: OAuth (`/auth/oauth/*`) — needs real
//! provider HTTP round-trips, deferred to its own slice. Per-IP route
//! throttling (`@Throttle` decorators) is also not implemented here —
//! the per-account login lockout and per-destination OTP rate limits
//! (both Redis-backed) ARE ported, since those are the security-critical
//! behaviors; IP-level throttling is abuse-shielding on top, not
//! something auth correctness depends on.

use axum::extract::{ConnectInfo, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Json, Response};
use axum::routing::{get, post};
use axum::Router;
use serde::Deserialize;
use serde_json::json;
use std::net::SocketAddr;
use std::sync::Arc;

use crate::cookies::{build_auth_set_cookie_headers, build_clear_cookie_headers, AuthCookiePair};
use crate::state::AppState;

const MAX_LOGIN_FAILURES: i64 = 5;
const LOGIN_LOCKOUT_SECONDS: i64 = 15 * 60;
const OTP_EXPIRY_MINUTES: i64 = 10;
const OTP_MAX_ATTEMPTS: i32 = 5;
const OTP_RESEND_COOLDOWN_SECONDS: i64 = 60;
const OTP_HOURLY_WINDOW_SECONDS: i64 = 60 * 60;
const OTP_MAX_SENDS_PER_HOUR: i64 = 5;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/signup", post(signup))
        .route("/auth/verify-otp", post(verify_otp))
        .route("/auth/resend-otp", post(resend_otp))
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/logout-all", post(logout_all))
        .route("/auth/forgot-password", post(forgot_password))
        .route("/auth/reset-password", post(reset_password))
        .route("/auth/me", get(me))
}

// ---------- shared error type ----------

pub(crate) enum AppError {
    BadRequest(String),
    Unauthorized(String),
    Conflict(String),
    TooManyRequests(String),
    ServiceUnavailable,
    Internal,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m),
            AppError::TooManyRequests(m) => (StatusCode::TOO_MANY_REQUESTS, m),
            AppError::ServiceUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                "Database unavailable.".to_string(),
            ),
            AppError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Something went wrong.".to_string(),
            ),
        };
        (status, Json(json!({ "message": message }))).into_response()
    }
}

pub(crate) fn db_error(err: sqlx::Error) -> AppError {
    tracing::error!(error = %err, "database error in auth route");
    AppError::Internal
}

// ---------- request bodies ----------

#[derive(Deserialize)]
struct SignupBody {
    email: String,
    password: String,
    name: Option<String>,
}

#[derive(Deserialize)]
struct LoginBody {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct VerifyOtpBody {
    email: String,
    code: String,
    purpose: String,
}

#[derive(Deserialize)]
struct ResendOtpBody {
    email: String,
    purpose: String,
}

#[derive(Deserialize)]
struct ForgotPasswordBody {
    email: String,
}

#[derive(Deserialize)]
struct ResetPasswordBody {
    email: String,
    code: String,
    #[serde(rename = "newPassword")]
    new_password: String,
}

fn validate_email(email: &str) -> Result<(), AppError> {
    if email.trim().is_empty() || !email.contains('@') {
        return Err(AppError::BadRequest("email must be an email".into()));
    }
    Ok(())
}

fn validate_password(password: &str) -> Result<(), AppError> {
    if password.len() < 8 || password.len() > 128 {
        return Err(AppError::BadRequest(
            "Password must be between 8 and 128 characters.".into(),
        ));
    }
    Ok(())
}

// ---------- request metadata (ip / user-agent) ----------

pub(crate) struct RequestMeta {
    ip: Option<String>,
    user_agent: Option<String>,
}

pub(crate) fn request_meta(connect_info: &ConnectInfo<SocketAddr>, headers: &HeaderMap) -> RequestMeta {
    RequestMeta {
        ip: Some(connect_info.0.ip().to_string()),
        user_agent: headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string()),
    }
}

// ---------- cookie extraction ----------

fn get_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = headers.get(header::COOKIE)?.to_str().ok()?;
    for pair in raw.split(';') {
        if let Some((k, v)) = pair.trim().split_once('=') {
            if k == name {
                return Some(v.to_string());
            }
        }
    }
    None
}

// ---------- shared: user JSON shape (matches UsersService.toPublic) ----------

pub(crate) fn user_json(user: engine_data::User) -> serde_json::Value {
    let created_at_utc =
        chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(user.created_at, chrono::Utc);
    json!({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatarUrl": user.avatar_url,
        "emailVerified": user.email_verified.is_some(),
        "createdAt": created_at_utc,
    })
}

// ---------- shared: audit log (fire-and-forget — never fails the request) ----------

pub(crate) async fn audit(
    state: &AppState,
    event: &str,
    user_id: Option<&str>,
    meta: &RequestMeta,
    metadata: Option<serde_json::Value>,
) {
    let Some(pool) = &state.db else { return };
    let id = crate::ids::generate_id();
    if let Err(err) = engine_data::insert_audit_log(
        pool,
        &id,
        user_id,
        event,
        meta.ip.as_deref(),
        meta.user_agent.as_deref(),
        metadata,
    )
    .await
    {
        // Matches the gateway's intent: audit logging must never be able
        // to break the actual auth flow it's observing.
        tracing::warn!(error = %err, event, "failed to write audit log");
    }
}

// ---------- shared: OTP issuance (matches OtpService.issue) ----------

async fn issue_otp(
    state: &AppState,
    destination: &str,
    purpose: &str,
    user_id: Option<&str>,
) -> Result<(), AppError> {
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;

    if let Some(redis) = &state.redis {
        let cooldown_key = format!("otp:cooldown:{purpose}:{destination}");
        if redis.get(&cooldown_key).await.unwrap_or(None).is_some() {
            return Err(AppError::TooManyRequests(
                "Please wait before requesting another code.".into(),
            ));
        }

        let hourly_key = format!("otp:hourly:{purpose}:{destination}");
        let hourly_count = redis
            .incr_with_expiry(&hourly_key, OTP_HOURLY_WINDOW_SECONDS)
            .await
            .unwrap_or(1);
        if hourly_count > OTP_MAX_SENDS_PER_HOUR {
            return Err(AppError::TooManyRequests(
                "Too many codes requested. Please try again later.".into(),
            ));
        }
    } else {
        tracing::warn!("Redis unavailable — OTP rate limiting disabled for this request");
    }

    engine_data::invalidate_unconsumed_otp_codes(pool, destination, purpose)
        .await
        .map_err(db_error)?;

    let code = engine_auth::otp::generate_code();
    let code_hash = engine_auth::otp::hash_code(&code);
    let expires_at =
        (chrono::Utc::now() + chrono::Duration::minutes(OTP_EXPIRY_MINUTES)).naive_utc();
    let id = crate::ids::generate_id();

    engine_data::create_otp_code(pool, &id, destination, purpose, &code_hash, expires_at, user_id)
        .await
        .map_err(db_error)?;

    if let Some(redis) = &state.redis {
        let cooldown_key = format!("otp:cooldown:{purpose}:{destination}");
        let _ = redis.set_ex(&cooldown_key, "1", OTP_RESEND_COOLDOWN_SECONDS).await;
    }

    crate::mail::log_otp_email(destination, &code, purpose, OTP_EXPIRY_MINUTES);
    Ok(())
}

/// Matches `OtpService.verify`. Returns the OTP row's `userId` on success.
async fn verify_otp_core(
    state: &AppState,
    destination: &str,
    purpose: &str,
    submitted_code: &str,
) -> Result<Option<String>, AppError> {
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;

    let otp = engine_data::find_latest_unconsumed_otp(pool, destination, purpose)
        .await
        .map_err(db_error)?
        .ok_or_else(|| AppError::BadRequest("No active code found. Please request a new one.".into()))?;

    if otp.expires_at < chrono::Utc::now().naive_utc() {
        return Err(AppError::BadRequest(
            "This code has expired. Please request a new one.".into(),
        ));
    }

    if otp.attempts >= OTP_MAX_ATTEMPTS {
        return Err(AppError::BadRequest(
            "Too many incorrect attempts. Please request a new code.".into(),
        ));
    }

    if !engine_auth::otp::verify_code(submitted_code, &otp.code_hash) {
        let _ = engine_data::increment_otp_attempts(pool, &otp.id).await;
        return Err(AppError::BadRequest("Incorrect code.".into()));
    }

    engine_data::consume_otp(pool, &otp.id).await.map_err(db_error)?;
    Ok(otp.user_id)
}

// ---------- shared: token issuance (matches AuthService.issueTokenPair) ----------

pub(crate) struct IssuedTokens {
    access_token: String,
    refresh_token: String,
    refresh_token_expires_at: chrono::NaiveDateTime,
}

pub(crate) async fn issue_token_pair(
    state: &AppState,
    user_id: &str,
    email: &str,
    meta: &RequestMeta,
) -> Result<IssuedTokens, AppError> {
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;

    let access_ttl_secs = engine_auth::parse_duration_secs(&state.config.jwt_access_expires_in)
        .map_err(|_| AppError::Internal)?;
    let access_token =
        engine_auth::sign_access_token(user_id, email, &state.config.jwt_access_secret, access_ttl_secs)
            .map_err(|_| AppError::Internal)?;

    let refresh_token = engine_auth::tokens::generate_opaque_token();
    let refresh_token_hash = engine_auth::tokens::hash_token(&refresh_token);
    let refresh_ttl_secs = engine_auth::parse_duration_secs(&state.config.jwt_refresh_expires_in)
        .map_err(|_| AppError::Internal)?;
    let refresh_token_expires_at =
        (chrono::Utc::now() + chrono::Duration::seconds(refresh_ttl_secs)).naive_utc();

    let session_id = crate::ids::generate_id();
    engine_data::create_session(
        pool,
        &session_id,
        user_id,
        &refresh_token_hash,
        refresh_token_expires_at,
        meta.ip.as_deref(),
        meta.user_agent.as_deref(),
    )
    .await
    .map_err(db_error)?;

    Ok(IssuedTokens {
        access_token,
        refresh_token,
        refresh_token_expires_at,
    })
}

pub(crate) fn set_cookies_response(
    state: &AppState,
    tokens: &IssuedTokens,
    body: serde_json::Value,
) -> Response {
    let access_ttl_secs =
        engine_auth::parse_duration_secs(&state.config.jwt_access_expires_in).unwrap_or(900);
    let refresh_max_age = (tokens.refresh_token_expires_at - chrono::Utc::now().naive_utc())
        .num_seconds()
        .max(0);

    let pair = AuthCookiePair {
        access_token: tokens.access_token.clone(),
        refresh_token: tokens.refresh_token.clone(),
        refresh_token_max_age_secs: refresh_max_age,
    };
    let (access_cookie, refresh_cookie) = build_auth_set_cookie_headers(
        &pair,
        access_ttl_secs,
        state.config.cookie_domain.as_deref(),
        state.config.is_prod,
    );

    let mut response = (StatusCode::OK, Json(body)).into_response();
    let headers = response.headers_mut();
    if let Ok(v) = HeaderValue::from_str(&access_cookie) {
        headers.append(header::SET_COOKIE, v);
    }
    if let Ok(v) = HeaderValue::from_str(&refresh_cookie) {
        headers.append(header::SET_COOKIE, v);
    }
    response
}

fn clear_cookies_response(state: &AppState, body: serde_json::Value) -> Response {
    let (access_cookie, refresh_cookie) =
        build_clear_cookie_headers(state.config.cookie_domain.as_deref(), state.config.is_prod);
    let mut response = (StatusCode::OK, Json(body)).into_response();
    let headers = response.headers_mut();
    if let Ok(v) = HeaderValue::from_str(&access_cookie) {
        headers.append(header::SET_COOKIE, v);
    }
    if let Ok(v) = HeaderValue::from_str(&refresh_cookie) {
        headers.append(header::SET_COOKIE, v);
    }
    response
}

// ---------- handlers ----------

async fn signup(
    State(state): State<Arc<AppState>>,
    Json(mut body): Json<SignupBody>,
) -> Result<Response, AppError> {
    body.email = engine_auth::normalize_email(&body.email);
    validate_email(&body.email)?;
    validate_password(&body.password)?;

    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;

    let existing = engine_data::get_user_by_email(pool, &body.email)
        .await
        .map_err(db_error)?;

    if let Some(ref existing_user) = existing {
        if existing_user.email_verified.is_some() {
            return Err(AppError::Conflict(
                "An account with this email already exists.".into(),
            ));
        }
    }

    let password_hash =
        engine_auth::password::hash_password(&body.password).map_err(|_| AppError::Internal)?;

    let user = match existing {
        Some(existing_user) => {
            engine_data::update_user_password_and_name(
                pool,
                &existing_user.id,
                &password_hash,
                body.name.as_deref(),
            )
            .await
            .map_err(db_error)?
        }
        None => {
            let id = crate::ids::generate_id();
            engine_data::create_user(pool, &id, &body.email, Some(&password_hash), body.name.as_deref())
                .await
                .map_err(db_error)?
        }
    };

    issue_otp(&state, &user.email, "SIGNUP_VERIFY", Some(&user.id)).await?;
    audit(&state, "SIGNUP", Some(&user.id), &RequestMeta { ip: None, user_agent: None }, None).await;

    Ok((
        StatusCode::CREATED,
        Json(json!({ "message": "Account created. Check your email for a verification code." })),
    )
        .into_response())
}

async fn verify_otp(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(mut body): Json<VerifyOtpBody>,
) -> Result<Response, AppError> {
    body.email = engine_auth::normalize_email(&body.email);
    if body.purpose != "SIGNUP_VERIFY" {
        return Err(AppError::Unauthorized(
            "Unsupported verification purpose for this endpoint.".into(),
        ));
    }
    let meta = request_meta(&ConnectInfo(addr), &headers);

    verify_otp_core(&state, &body.email, "SIGNUP_VERIFY", &body.code).await?;

    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let existing = engine_data::get_user_by_email(pool, &body.email)
        .await
        .map_err(db_error)?
        .ok_or_else(|| AppError::BadRequest("Account not found.".into()))?;

    let verified = engine_data::mark_email_verified(pool, &existing.id)
        .await
        .map_err(db_error)?;

    let tokens = issue_token_pair(&state, &verified.id, &verified.email, &meta).await?;
    audit(&state, "EMAIL_VERIFIED", Some(&verified.id), &meta, None).await;

    let body = json!({ "user": user_json(verified.into_public()) });
    Ok(set_cookies_response(&state, &tokens, body))
}

async fn resend_otp(
    State(state): State<Arc<AppState>>,
    Json(mut body): Json<ResendOtpBody>,
) -> Result<Response, AppError> {
    body.email = engine_auth::normalize_email(&body.email);
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let user = engine_data::get_user_by_email(pool, &body.email)
        .await
        .map_err(db_error)?;

    let Some(user) = user else {
        if body.purpose == "SIGNUP_VERIFY" {
            return Err(AppError::BadRequest(
                "No pending signup found for this email.".into(),
            ));
        }
        return Ok(Json(json!({ "message": "If an account exists, a code has been sent." })).into_response());
    };

    issue_otp(&state, &body.email, &body.purpose, Some(&user.id)).await?;
    Ok(Json(json!({ "message": "If an account exists, a code has been sent." })).into_response())
}

async fn login(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(mut body): Json<LoginBody>,
) -> Result<Response, AppError> {
    body.email = engine_auth::normalize_email(&body.email);
    let meta = request_meta(&ConnectInfo(addr), &headers);
    let lockout_key = format!("login:lockout:{}", body.email);
    let fails_key = format!("login:fails:{}", body.email);

    if let Some(redis) = &state.redis {
        if redis.get(&lockout_key).await.unwrap_or(None).is_some() {
            audit(&state, "LOGIN_LOCKED", None, &meta, Some(json!({ "email": body.email }))).await;
            return Err(AppError::TooManyRequests(
                "Too many failed sign-in attempts. Please try again in 15 minutes, or reset your password."
                    .into(),
            ));
        }
    }

    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let user = engine_data::get_user_by_email(pool, &body.email)
        .await
        .map_err(db_error)?;

    async fn record_failure(
        state: &AppState,
        fails_key: &str,
        lockout_key: &str,
        user_id: Option<&str>,
        meta: &RequestMeta,
        email: &str,
    ) -> AppError {
        let mut attempt = 0i64;
        if let Some(redis) = &state.redis {
            attempt = redis
                .incr_with_expiry(fails_key, LOGIN_LOCKOUT_SECONDS)
                .await
                .unwrap_or(0);
            if attempt >= MAX_LOGIN_FAILURES {
                let _ = redis.set_ex(lockout_key, "1", LOGIN_LOCKOUT_SECONDS).await;
            }
        }
        audit(
            state,
            "LOGIN_FAILED",
            user_id,
            meta,
            Some(json!({ "email": email, "attempt": attempt })),
        )
        .await;
        AppError::Unauthorized("Invalid email or password.".into())
    }

    let user = match &user {
        Some(u) if u.password_hash.is_some() => u,
        _ => {
            return Err(record_failure(
                &state,
                &fails_key,
                &lockout_key,
                user.as_ref().map(|u| u.id.as_str()),
                &meta,
                &body.email,
            )
            .await)
        }
    };

    let password_ok = engine_auth::password::verify_password(
        user.password_hash.as_deref().unwrap_or(""),
        &body.password,
    )
    .unwrap_or(false);

    if !password_ok {
        return Err(record_failure(&state, &fails_key, &lockout_key, Some(&user.id), &meta, &body.email).await);
    }

    if user.email_verified.is_none() {
        issue_otp(&state, &user.email, "SIGNUP_VERIFY", Some(&user.id)).await?;
        return Err(AppError::BadRequest(
            "Email not verified. A new verification code has been sent.".into(),
        ));
    }

    if let Some(redis) = &state.redis {
        let _ = redis.del(&[fails_key.as_str(), lockout_key.as_str()]).await;
    }

    let tokens = issue_token_pair(&state, &user.id, &user.email, &meta).await?;
    audit(&state, "LOGIN_SUCCESS", Some(&user.id), &meta, None).await;

    let body = json!({ "user": user_json(user.clone().into_public()) });
    Ok(set_cookies_response(&state, &tokens, body))
}

async fn refresh(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let meta = request_meta(&ConnectInfo(addr), &headers);
    let raw_refresh_token = get_cookie(&headers, "refresh_token")
        .ok_or_else(|| AppError::Unauthorized("Missing refresh token.".into()))?;

    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let token_hash = engine_auth::tokens::hash_token(&raw_refresh_token);
    let session = engine_data::find_session_by_refresh_hash(pool, &token_hash)
        .await
        .map_err(db_error)?;

    let session = match session {
        Some(s) if !s.revoked && s.expires_at >= chrono::Utc::now().naive_utc() => s,
        Some(s) if s.revoked => {
            // Reuse of an already-revoked refresh token — treat as a
            // possible theft signal and revoke every session for the user.
            let _ = engine_data::revoke_all_sessions_for_user(pool, &s.user_id).await;
            audit(
                &state,
                "TOKEN_REUSE_DETECTED",
                Some(&s.user_id),
                &meta,
                Some(json!({ "sessionId": s.id })),
            )
            .await;
            return Err(AppError::Unauthorized("Invalid or expired refresh token.".into()));
        }
        _ => return Err(AppError::Unauthorized("Invalid or expired refresh token.".into())),
    };

    engine_data::revoke_session_by_id(pool, &session.id)
        .await
        .map_err(db_error)?;

    let user = engine_data::get_user_by_id(pool, &session.user_id)
        .await
        .map_err(db_error)?
        .ok_or_else(|| AppError::Unauthorized("User not found.".into()))?;

    audit(&state, "TOKEN_REFRESHED", Some(&user.id), &meta, None).await;

    let tokens = issue_token_pair(&state, &user.id, &user.email, &meta).await?;
    Ok(set_cookies_response(&state, &tokens, json!({ "ok": true })))
}

async fn logout(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let meta = request_meta(&ConnectInfo(addr), &headers);

    if let Some(raw_refresh_token) = get_cookie(&headers, "refresh_token") {
        if let Some(pool) = &state.db {
            let token_hash = engine_auth::tokens::hash_token(&raw_refresh_token);
            if let Ok(Some(session)) = engine_data::find_session_by_refresh_hash(pool, &token_hash).await {
                let _ = engine_data::revoke_session_by_refresh_hash(pool, &token_hash).await;
                audit(&state, "LOGOUT", Some(&session.user_id), &meta, None).await;
            }
        }
    }

    Ok(clear_cookies_response(&state, json!({ "ok": true })))
}

async fn logout_all(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let meta = request_meta(&ConnectInfo(addr), &headers);
    let claims = authenticate(&state, &headers)?;

    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    engine_data::revoke_all_sessions_for_user(pool, &claims.sub)
        .await
        .map_err(db_error)?;
    audit(&state, "LOGOUT_ALL", Some(&claims.sub), &meta, None).await;

    Ok(clear_cookies_response(&state, json!({ "ok": true })))
}

async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(mut body): Json<ForgotPasswordBody>,
) -> Result<Response, AppError> {
    body.email = engine_auth::normalize_email(&body.email);
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    if let Some(user) = engine_data::get_user_by_email(pool, &body.email)
        .await
        .map_err(db_error)?
    {
        issue_otp(&state, &body.email, "PASSWORD_RESET", Some(&user.id)).await?;
        audit(
            &state,
            "PASSWORD_RESET_REQUESTED",
            Some(&user.id),
            &RequestMeta { ip: None, user_agent: None },
            None,
        )
        .await;
    }
    Ok(Json(json!({ "message": "If an account exists, a reset code has been sent." })).into_response())
}

async fn reset_password(
    State(state): State<Arc<AppState>>,
    Json(mut body): Json<ResetPasswordBody>,
) -> Result<Response, AppError> {
    body.email = engine_auth::normalize_email(&body.email);
    validate_password(&body.new_password)?;
    verify_otp_core(&state, &body.email, "PASSWORD_RESET", &body.code).await?;

    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let user = engine_data::get_user_by_email(pool, &body.email)
        .await
        .map_err(db_error)?
        .ok_or_else(|| AppError::BadRequest("Account not found.".into()))?;

    let password_hash =
        engine_auth::password::hash_password(&body.new_password).map_err(|_| AppError::Internal)?;
    engine_data::set_password(pool, &user.id, &password_hash)
        .await
        .map_err(db_error)?;

    // A password change logs out every device, same as `logoutAll`. The
    // real gateway does this by literally calling its `logoutAll(userId)`
    // helper, which — separately from the PASSWORD_RESET_COMPLETED audit
    // entry below — writes its OWN 'LOGOUT_ALL' audit row (with no
    // ip/userAgent, since that internal call passes no meta). Matching
    // that exactly rather than only doing the session revocation, so the
    // audit trail has the same two entries the gateway would produce.
    engine_data::revoke_all_sessions_for_user(pool, &user.id)
        .await
        .map_err(db_error)?;
    audit(
        &state,
        "LOGOUT_ALL",
        Some(&user.id),
        &RequestMeta { ip: None, user_agent: None },
        None,
    )
    .await;

    if let Some(redis) = &state.redis {
        let fails_key = format!("login:fails:{}", body.email);
        let lockout_key = format!("login:lockout:{}", body.email);
        let _ = redis.del(&[fails_key.as_str(), lockout_key.as_str()]).await;
    }

    audit(
        &state,
        "PASSWORD_RESET_COMPLETED",
        Some(&user.id),
        &RequestMeta { ip: None, user_agent: None },
        None,
    )
    .await;

    Ok(Json(json!({ "message": "Password updated. Please sign in again." })).into_response())
}

async fn me(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, AppError> {
    let claims = authenticate(&state, &headers)?;
    let pool = state.db.as_ref().ok_or(AppError::ServiceUnavailable)?;
    let user = engine_data::get_user_by_id(pool, &claims.sub)
        .await
        .map_err(db_error)?
        .ok_or_else(|| AppError::Unauthorized("Not authenticated.".into()))?;
    Ok(Json(user_json(user)).into_response())
}

/// Shared JwtAuthGuard-equivalent: verifies the access token from either
/// the `Authorization` header or the `access_token` cookie.
fn authenticate(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<engine_auth::AccessTokenClaims, AppError> {
    let bearer = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok());
    let cookie = get_cookie(headers, "access_token");
    let token = engine_auth::extract_access_token(bearer, cookie.as_deref())
        .map_err(|_| AppError::Unauthorized("Not authenticated.".into()))?;
    engine_auth::verify_access_token(token, &state.config.jwt_access_secret)
        .map_err(|_| AppError::Unauthorized("Not authenticated.".into()))
}
