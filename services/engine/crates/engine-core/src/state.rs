use crate::config::Config;
use crate::redis_client::RedisClient;

#[derive(Clone)]
pub struct AppState {
    pub db: Option<engine_data::Pool>,
    pub redis: Option<RedisClient>,
    pub config: Config,
    /// Shared HTTP client for OAuth token-exchange/userinfo calls.
    /// Built ONCE at boot and reused — reqwest::Client is internally
    /// connection-pooled (Arc-based), so constructing a new one per
    /// request (an easy mistake) would defeat that pooling and leak
    /// sockets under load. This is the correct production pattern, not
    /// a micro-optimization.
    pub http: reqwest::Client,
}
