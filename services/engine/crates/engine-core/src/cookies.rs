//! Matches `services/gateway/src/common/cookies.ts` exactly: same two
//! cookies, same flags, same path scoping (`access_token` on `/`,
//! `refresh_token` scoped to `/auth` only so it's never sent to
//! non-auth routes), same `secure` behavior (only when NODE_ENV is
//! literally "production", matching the gateway's own check).

pub struct AuthCookiePair {
    pub access_token: String,
    pub refresh_token: String,
    pub refresh_token_max_age_secs: i64,
}

/// Builds the two raw `Set-Cookie` header values for a fresh token pair.
/// Callers append both to the response (axum requires `HeaderMap::append`
/// for repeated header names — a single `insert` would silently drop the
/// first cookie).
pub fn build_auth_set_cookie_headers(
    pair: &AuthCookiePair,
    access_ttl_secs: i64,
    cookie_domain: Option<&str>,
    is_prod: bool,
) -> (String, String) {
    let secure_flag = if is_prod { "; Secure" } else { "" };
    let domain_flag = cookie_domain
        .map(|d| format!("; Domain={d}"))
        .unwrap_or_default();

    let access = format!(
        "access_token={}; Max-Age={}; Path=/; HttpOnly; SameSite=Lax{}{}",
        pair.access_token, access_ttl_secs, secure_flag, domain_flag
    );
    let refresh = format!(
        "refresh_token={}; Max-Age={}; Path=/auth; HttpOnly; SameSite=Lax{}{}",
        pair.refresh_token, pair.refresh_token_max_age_secs, secure_flag, domain_flag
    );
    (access, refresh)
}

/// Matches `clearAuthCookies` — same path scoping per cookie, immediate
/// expiry via Max-Age=0.
pub fn build_clear_cookie_headers(cookie_domain: Option<&str>, is_prod: bool) -> (String, String) {
    let secure_flag = if is_prod { "; Secure" } else { "" };
    let domain_flag = cookie_domain
        .map(|d| format!("; Domain={d}"))
        .unwrap_or_default();

    let access = format!(
        "access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax{}{}",
        secure_flag, domain_flag
    );
    let refresh = format!(
        "refresh_token=; Max-Age=0; Path=/auth; HttpOnly; SameSite=Lax{}{}",
        secure_flag, domain_flag
    );
    (access, refresh)
}
