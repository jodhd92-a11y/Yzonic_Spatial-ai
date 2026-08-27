//! engine-core bootstrap. Route handlers live in `routes/auth.rs` (a
//! faithful port of the gateway's `auth.controller.ts` +
//! `auth.service.ts` + `otp.service.ts`); this file is just wiring:
//! config, DB/Redis connections (both optional at boot — see the doc
//! comments on `config::Config` and the connect calls below for why),
//! tracing, and the axum router/listener.

mod config;
mod cookies;
mod ids;
mod mail;
mod redis_client;
mod routes;
mod state;

use axum::Router;
use state::AppState;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "engine_core=info,tower_http=info".into()),
        )
        .init();

    let config = config::Config::from_env();

    // Deliberately does NOT fail startup if Postgres/Redis are
    // unreachable — /healthz must stay meaningful even if a dependency
    // is down, and week-1 deliverable #1 (boot + healthz) is explicitly
    // ordered *before* any DB dependency in the blueprint. Auth routes
    // that genuinely need the DB/Redis return 503, not a crashed process.
    let db = match &config.database_url {
        Some(url) => match engine_data::connect(url).await {
            Ok(pool) => {
                match engine_data::health_check_users_table(&pool).await {
                    Ok(count) => tracing::info!(user_count = count, "connected to existing gateway Postgres; users table reachable"),
                    Err(err) => tracing::error!(error = %err, "connected to Postgres but query against \"users\" failed — check schema/migrations match"),
                }
                Some(pool)
            }
            Err(err) => {
                tracing::error!(error = %err, "could not connect to DATABASE_URL — booting anyway, DB-backed routes will 503");
                None
            }
        },
        None => {
            tracing::warn!("DATABASE_URL not set — booting without a database connection");
            None
        }
    };

    let redis = match redis_client::RedisClient::connect(&config.redis_url).await {
        Ok(client) => {
            tracing::info!("connected to Redis");
            Some(client)
        }
        Err(err) => {
            tracing::warn!(error = %err, "could not connect to Redis — login lockout / OTP rate limiting disabled for this run");
            None
        }
    };

    let state = Arc::new(AppState {
        db,
        redis,
        config: config.clone(),
        http: reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client"),
    });

    let app = Router::new()
        .route("/healthz", axum::routing::get(healthz))
        .merge(routes::auth::router())
        .merge(routes::oauth::router())
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive()) // TODO: replace with the real CORS_ORIGIN allowlist before this leaves dev, matching main.ts's `enableCors`
        .with_state(state);

    let addr = format!("0.0.0.0:{}", config.engine_port);
    tracing::info!(%addr, "engine-core listening");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

async fn healthz(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> impl axum::response::IntoResponse {
    let db_ok = match &state.db {
        Some(pool) => engine_data::health_check_users_table(pool).await.is_ok(),
        None => false,
    };
    let redis_ok = state.redis.is_some();

    axum::Json(serde_json::json!({
        "status": "ok",
        "db_connected": db_ok,
        "redis_connected": redis_ok,
    }))
}
