//! Loads the same env vars the gateway reads, with the same defaults
//! where the gateway has one (see auth.service.ts / cookies.ts). No new
//! config surface introduced here beyond `ENGINE_PORT`, which is
//! engine-core's own listen port (deliberately different from the
//! gateway's `PORT=4000` so both can run side by side).

#[derive(Clone)]
pub struct Config {
    pub database_url: Option<String>,
    pub redis_url: String,
    pub jwt_access_secret: String,
    pub jwt_access_expires_in: String,
    pub jwt_refresh_expires_in: String,
    pub cookie_domain: Option<String>,
    pub is_prod: bool,
    pub engine_port: String,
    pub frontend_url: String,

    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_callback_url: Option<String>,

    pub github_client_id: Option<String>,
    pub github_client_secret: Option<String>,
    pub github_callback_url: Option<String>,
}

/// A var counts as "configured" only if it's set AND non-empty — matches
/// `OAuthConfigService.isConfigured`'s `!!value` truthiness check (an
/// empty string in `.env` is falsy in JS, so should be treated as
/// "not configured" here too, not as Some("")).
fn non_empty_env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.is_empty())
}

impl Config {
    pub fn from_env() -> Self {
        let jwt_access_secret = std::env::var("JWT_ACCESS_SECRET").unwrap_or_else(|_| {
            tracing::warn!("JWT_ACCESS_SECRET not set — falling back to a dev-only default. Do not run this in any shared environment.");
            "dev-only-insecure-secret".to_string()
        });

        Self {
            database_url: std::env::var("DATABASE_URL").ok(),
            redis_url: std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            jwt_access_secret,
            jwt_access_expires_in: std::env::var("JWT_ACCESS_EXPIRES_IN").unwrap_or_else(|_| "15m".to_string()),
            jwt_refresh_expires_in: std::env::var("JWT_REFRESH_EXPIRES_IN").unwrap_or_else(|_| "30d".to_string()),
            cookie_domain: std::env::var("COOKIE_DOMAIN").ok().filter(|s| !s.is_empty()),
            is_prod: std::env::var("NODE_ENV").map(|v| v == "production").unwrap_or(false),
            engine_port: std::env::var("ENGINE_PORT").unwrap_or_else(|_| "4100".to_string()),
            frontend_url: std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()),

            google_client_id: non_empty_env("GOOGLE_CLIENT_ID"),
            google_client_secret: non_empty_env("GOOGLE_CLIENT_SECRET"),
            google_callback_url: non_empty_env("GOOGLE_CALLBACK_URL"),

            github_client_id: non_empty_env("GITHUB_CLIENT_ID"),
            github_client_secret: non_empty_env("GITHUB_CLIENT_SECRET"),
            github_callback_url: non_empty_env("GITHUB_CALLBACK_URL"),
        }
    }

    /// Matches `OAuthConfigService.isConfigured('google')`.
    pub fn google_configured(&self) -> bool {
        self.google_client_id.is_some() && self.google_client_secret.is_some()
    }

    /// Matches `OAuthConfigService.isConfigured('github')`.
    pub fn github_configured(&self) -> bool {
        self.github_client_id.is_some() && self.github_client_secret.is_some()
    }
}
