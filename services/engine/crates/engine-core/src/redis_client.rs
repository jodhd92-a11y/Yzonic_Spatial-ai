//! Matches `services/gateway/src/redis/redis.service.ts`'s surface —
//! just the operations `AuthService`/`OtpService` actually use:
//! `get`, `set` with a TTL, `del`, and `incrWithExpiry` (increment a
//! counter, set its TTL only on the first increment — used for both
//! login-failure counting and OTP send-rate counting).

use redis::aio::ConnectionManager;
use redis::AsyncCommands;

#[derive(Clone)]
pub struct RedisClient {
    conn: ConnectionManager,
}

impl RedisClient {
    pub async fn connect(redis_url: &str) -> anyhow::Result<Self> {
        let client = redis::Client::open(redis_url)?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    pub async fn get(&self, key: &str) -> redis::RedisResult<Option<String>> {
        self.conn.clone().get(key).await
    }

    pub async fn set_ex(&self, key: &str, value: &str, ttl_secs: i64) -> redis::RedisResult<()> {
        self.conn.clone().set_ex(key, value, ttl_secs as u64).await
    }

    /// Atomic get-and-delete (Redis `GETDEL`, 6.2+). Used for one-time-use
    /// tokens (OAuth CSRF state) where a plain GET-then-DEL would leave a
    /// narrow race: two concurrent requests presenting the same token
    /// could both see it as valid before either deletes it. GETDEL closes
    /// that window — the check and the consumption are a single atomic
    /// server-side operation.
    pub async fn get_del(&self, key: &str) -> redis::RedisResult<Option<String>> {
        let mut conn = self.conn.clone();
        redis::cmd("GETDEL").arg(key).query_async(&mut conn).await
    }

    pub async fn del(&self, keys: &[&str]) -> redis::RedisResult<()> {
        if keys.is_empty() {
            return Ok(());
        }
        self.conn.clone().del(keys).await
    }

    /// Matches `RedisService.incrWithExpiry` exactly: `INCR`, and only if
    /// the result is 1 (i.e. this was the key's first increment in the
    /// current window) set its TTL. This is what makes it a sliding
    /// "N per window" counter rather than a counter with a TTL reset on
    /// every hit.
    pub async fn incr_with_expiry(&self, key: &str, ttl_secs: i64) -> redis::RedisResult<i64> {
        let mut conn = self.conn.clone();
        let count: i64 = conn.incr(key, 1).await?;
        if count == 1 {
            let _: () = conn.expire(key, ttl_secs).await?;
        }
        Ok(count)
    }
}
