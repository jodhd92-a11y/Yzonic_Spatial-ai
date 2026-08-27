//! Data platform crate — talks to the *same* Postgres database the NestJS
//! gateway already uses via Prisma. No schema redesign here: models and
//! queries below mirror `services/gateway/prisma/schema.prisma` field for
//! field, including Prisma's default column-naming behavior (camelCase
//! columns, unquoted-identifier-hostile, hence the quoted idents in SQL).
//!
//! Week-1 deliverable (blueprint section 5, item 2): `connect()` +
//! `health_check_users_table()` prove the schema translation by doing a
//! real read-only query against `users` — no writes, no migrations touched.

use sqlx::postgres::{PgPool, PgPoolOptions};
use sqlx::FromRow;

pub type Pool = PgPool;

/// Mirrors `model User` in schema.prisma. Note `id` is Prisma's default
/// `cuid()` — a text id, NOT a uuid column — so this intentionally does
/// not use the `uuid` crate for `id`. Don't "upgrade" this to a Uuid type
/// during the port; it would silently break every existing session/token
/// row that references a cuid string.
///
/// `email_verified` and `created_at` are `NaiveDateTime` (no timezone),
/// NOT `DateTime<Utc>` — confirmed against the real database at runtime
/// (sqlx error: "TIMESTAMPTZ is not compatible with SQL type TIMESTAMP").
/// Prisma's plain `DateTime` maps to Postgres `TIMESTAMP` unless the
/// schema explicitly adds `@db.Timestamptz`, which this schema doesn't.
/// The gateway (Prisma/JS) treats these as UTC implicitly when it
/// serializes them with a trailing "Z" — engine-core does the same
/// explicit UTC assumption when building JSON responses (see main.rs),
/// rather than baking a timezone assumption into this struct.
#[derive(Debug, Clone, serde::Serialize, FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    #[sqlx(rename = "emailVerified")]
    pub email_verified: Option<chrono::NaiveDateTime>,
    pub name: Option<String>,
    #[sqlx(rename = "avatarUrl")]
    pub avatar_url: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: chrono::NaiveDateTime,
}

/// Connect to the database at `database_url`. Does not panic on failure —
/// engine-core should still boot and serve /healthz even if Postgres is
/// unreachable at startup (matches "boot + healthz before any business
/// logic" as the very first week-1 deliverable, ahead of DB dependency).
pub async fn connect(database_url: &str) -> anyhow::Result<Pool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;
    Ok(pool)
}

/// Read-only proof-of-life query against the existing `users` table.
/// Deliberately just a COUNT — no row data leaves this function — since
/// its only job is to prove engine-data can see the schema the NestJS
/// gateway already created via Prisma migrations.
pub async fn health_check_users_table(pool: &Pool) -> Result<i64, sqlx::Error> {
    let (count,): (i64,) = sqlx::query_as(r#"SELECT count(*) FROM "users""#)
        .fetch_one(pool)
        .await?;
    Ok(count)
}

/// Used by engine-auth's `/auth/me` port — looks up the user a validated
/// access-token JWT's `sub` claim points at. Column names are quoted to
/// match Prisma's camelCase columns exactly (Postgres folds unquoted
/// identifiers to lowercase, which would silently miss every column here
/// except `id`, `email`, and `name`).
pub async fn get_user_by_id(pool: &Pool, id: &str) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, "emailVerified", name, "avatarUrl", "createdAt"
        FROM "users"
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

/// Internal row shape carrying `passwordHash` — never exposed outside
/// engine-data. Kept separate from the public `User` struct (which is
/// what gets serialized into API responses) so a `passwordHash` column
/// can never accidentally leak into a JSON body through a shared type.
#[derive(Debug, Clone, FromRow)]
pub struct UserWithPasswordHash {
    pub id: String,
    pub email: String,
    #[sqlx(rename = "passwordHash")]
    pub password_hash: Option<String>,
    #[sqlx(rename = "emailVerified")]
    pub email_verified: Option<chrono::NaiveDateTime>,
    pub name: Option<String>,
    #[sqlx(rename = "avatarUrl")]
    pub avatar_url: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: chrono::NaiveDateTime,
}

impl UserWithPasswordHash {
    pub fn into_public(self) -> User {
        User {
            id: self.id,
            email: self.email,
            email_verified: self.email_verified,
            name: self.name,
            avatar_url: self.avatar_url,
            created_at: self.created_at,
        }
    }
}

pub async fn get_user_by_email(
    pool: &Pool,
    email: &str,
) -> Result<Option<UserWithPasswordHash>, sqlx::Error> {
    sqlx::query_as::<_, UserWithPasswordHash>(
        r#"
        SELECT id, email, "passwordHash", "emailVerified", name, "avatarUrl", "createdAt"
        FROM "users"
        WHERE email = $1
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await
}

pub async fn get_user_with_password_by_id(
    pool: &Pool,
    id: &str,
) -> Result<Option<UserWithPasswordHash>, sqlx::Error> {
    sqlx::query_as::<_, UserWithPasswordHash>(
        r#"
        SELECT id, email, "passwordHash", "emailVerified", name, "avatarUrl", "createdAt"
        FROM "users"
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

/// Creates a brand-new user row. `id` is generated by the CALLER (a v4
/// UUID string, not a real `cuid()` — see the crate-level note below on
/// why that's fine) since Prisma's `@default(cuid())` is applied
/// client-side by the Prisma Client, not by a Postgres column default;
/// there is no DB-level default to fall back on here.
pub async fn create_user(
    pool: &Pool,
    id: &str,
    email: &str,
    password_hash: Option<&str>,
    name: Option<&str>,
) -> Result<UserWithPasswordHash, sqlx::Error> {
    sqlx::query_as::<_, UserWithPasswordHash>(
        r#"
        INSERT INTO "users" (id, email, "passwordHash", name, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'ACTIVE', now(), now())
        RETURNING id, email, "passwordHash", "emailVerified", name, "avatarUrl", "createdAt"
        "#,
    )
    .bind(id)
    .bind(email)
    .bind(password_hash)
    .bind(name)
    .fetch_one(pool)
    .await
}

/// Re-signup path: an unverified account signing up again gets its
/// password (and optionally name) overwritten rather than a duplicate
/// row created — matches `AuthService.signup`'s `existing ? update() :
/// create()` branch exactly.
pub async fn update_user_password_and_name(
    pool: &Pool,
    id: &str,
    password_hash: &str,
    name: Option<&str>,
) -> Result<UserWithPasswordHash, sqlx::Error> {
    sqlx::query_as::<_, UserWithPasswordHash>(
        r#"
        UPDATE "users"
        SET "passwordHash" = $2, name = COALESCE($3, name), "updatedAt" = now()
        WHERE id = $1
        RETURNING id, email, "passwordHash", "emailVerified", name, "avatarUrl", "createdAt"
        "#,
    )
    .bind(id)
    .bind(password_hash)
    .bind(name)
    .fetch_one(pool)
    .await
}

pub async fn mark_email_verified(
    pool: &Pool,
    id: &str,
) -> Result<UserWithPasswordHash, sqlx::Error> {
    sqlx::query_as::<_, UserWithPasswordHash>(
        r#"
        UPDATE "users"
        SET "emailVerified" = now(), "updatedAt" = now()
        WHERE id = $1
        RETURNING id, email, "passwordHash", "emailVerified", name, "avatarUrl", "createdAt"
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
}

pub async fn set_password(pool: &Pool, id: &str, password_hash: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE "users" SET "passwordHash" = $2, "updatedAt" = now() WHERE id = $1"#)
        .bind(id)
        .bind(password_hash)
        .execute(pool)
        .await?;
    Ok(())
}

// ---------- Sessions (refresh tokens) ----------

/// Mirrors `model Session`. `refresh_token_hash` is a SHA-256 hex digest
/// — the raw refresh token is NEVER stored, matching the gateway exactly.
#[derive(Debug, Clone, FromRow)]
pub struct Session {
    pub id: String,
    #[sqlx(rename = "userId")]
    pub user_id: String,
    #[sqlx(rename = "refreshTokenHash")]
    pub refresh_token_hash: String,
    pub revoked: bool,
    #[sqlx(rename = "expiresAt")]
    pub expires_at: chrono::NaiveDateTime,
}

#[allow(clippy::too_many_arguments)]
pub async fn create_session(
    pool: &Pool,
    id: &str,
    user_id: &str,
    refresh_token_hash: &str,
    expires_at: chrono::NaiveDateTime,
    ip: Option<&str>,
    user_agent: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO "sessions" (id, "userId", "refreshTokenHash", "expiresAt", ip, "userAgent", revoked, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, false, now())
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(refresh_token_hash)
    .bind(expires_at)
    .bind(ip)
    .bind(user_agent)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn find_session_by_refresh_hash(
    pool: &Pool,
    refresh_token_hash: &str,
) -> Result<Option<Session>, sqlx::Error> {
    sqlx::query_as::<_, Session>(
        r#"
        SELECT id, "userId", "refreshTokenHash", revoked, "expiresAt"
        FROM "sessions"
        WHERE "refreshTokenHash" = $1
        "#,
    )
    .bind(refresh_token_hash)
    .fetch_optional(pool)
    .await
}

pub async fn revoke_session_by_id(pool: &Pool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE "sessions" SET revoked = true WHERE id = $1"#)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn revoke_session_by_refresh_hash(
    pool: &Pool,
    refresh_token_hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE "sessions" SET revoked = true WHERE "refreshTokenHash" = $1"#)
        .bind(refresh_token_hash)
        .execute(pool)
        .await?;
    Ok(())
}

/// Used both for `logout-all` and for reuse-detection (a revoked token
/// presented again revokes every session for that user) — matches
/// `AuthService.refresh`'s theft-signal branch exactly.
pub async fn revoke_all_sessions_for_user(pool: &Pool, user_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE "sessions" SET revoked = true WHERE "userId" = $1"#)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

// ---------- OTP codes ----------

/// Mirrors `model OtpCode`. `purpose` is a Postgres enum column
/// (`"OtpPurpose"`); read/written via explicit `::text` / `::"OtpPurpose"`
/// casts in SQL rather than a custom sqlx enum mapping, to keep this
/// crate's dependency footprint small.
#[derive(Debug, Clone, FromRow)]
pub struct OtpCode {
    pub id: String,
    #[sqlx(rename = "userId")]
    pub user_id: Option<String>,
    pub destination: String,
    #[sqlx(rename = "codeHash")]
    pub code_hash: String,
    pub attempts: i32,
    #[sqlx(rename = "expiresAt")]
    pub expires_at: chrono::NaiveDateTime,
}

/// Invalidates any prior unconsumed codes for this destination+purpose —
/// matches the `updateMany({ consumedAt: null }, { consumedAt: now() })`
/// call at the top of `OtpService.issue`, so only the newest code is ever
/// valid.
pub async fn invalidate_unconsumed_otp_codes(
    pool: &Pool,
    destination: &str,
    purpose: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE "otp_codes"
        SET "consumedAt" = now()
        WHERE destination = $1 AND purpose = $2::"OtpPurpose" AND "consumedAt" IS NULL
        "#,
    )
    .bind(destination)
    .bind(purpose)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn create_otp_code(
    pool: &Pool,
    id: &str,
    destination: &str,
    purpose: &str,
    code_hash: &str,
    expires_at: chrono::NaiveDateTime,
    user_id: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO "otp_codes" (id, "userId", destination, "codeHash", purpose, attempts, "expiresAt", "createdAt")
        VALUES ($1, $2, $3, $4, $5::"OtpPurpose", 0, $6, now())
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(destination)
    .bind(code_hash)
    .bind(purpose)
    .bind(expires_at)
    .execute(pool)
    .await?;
    Ok(())
}

/// The most recent unconsumed code for a destination+purpose — matches
/// `findFirst({ consumedAt: null }, orderBy: { createdAt: 'desc' })`.
pub async fn find_latest_unconsumed_otp(
    pool: &Pool,
    destination: &str,
    purpose: &str,
) -> Result<Option<OtpCode>, sqlx::Error> {
    sqlx::query_as::<_, OtpCode>(
        r#"
        SELECT id, "userId", destination, "codeHash", attempts, "expiresAt"
        FROM "otp_codes"
        WHERE destination = $1 AND purpose = $2::"OtpPurpose" AND "consumedAt" IS NULL
        ORDER BY "createdAt" DESC
        LIMIT 1
        "#,
    )
    .bind(destination)
    .bind(purpose)
    .fetch_optional(pool)
    .await
}

pub async fn increment_otp_attempts(pool: &Pool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE "otp_codes" SET attempts = attempts + 1 WHERE id = $1"#)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn consume_otp(pool: &Pool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE "otp_codes" SET "consumedAt" = now() WHERE id = $1"#)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// ---------- OAuth accounts ----------

/// Looks up which user (if any) an OAuth identity is already linked to.
/// Matches the first branch of `AuthService.handleOAuthLogin`'s lookup —
/// exact (provider, providerAccountId) match, which is the DB's own
/// unique constraint (`@@unique([provider, providerAccountId])`).
pub async fn find_oauth_account_user_id(
    pool: &Pool,
    provider: &str,
    provider_account_id: &str,
) -> Result<Option<String>, sqlx::Error> {
    let row: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT "userId" FROM "oauth_accounts"
        WHERE provider = $1::"Provider" AND "providerAccountId" = $2
        "#,
    )
    .bind(provider)
    .bind(provider_account_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|(id,)| id))
}

pub async fn create_oauth_account(
    pool: &Pool,
    id: &str,
    provider: &str,
    provider_account_id: &str,
    user_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO "oauth_accounts" (id, provider, "providerAccountId", "userId", "createdAt")
        VALUES ($1, $2::"Provider", $3, $4, now())
        "#,
    )
    .bind(id)
    .bind(provider)
    .bind(provider_account_id)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Brand-new user created purely from an OAuth profile — no password.
/// `emailVerified` is set immediately (`now()`), matching
/// `AuthService.handleOAuthLogin`'s comment: "the provider already
/// verified this email."
pub async fn create_oauth_user(
    pool: &Pool,
    id: &str,
    email: &str,
    name: Option<&str>,
    avatar_url: Option<&str>,
) -> Result<UserWithPasswordHash, sqlx::Error> {
    sqlx::query_as::<_, UserWithPasswordHash>(
        r#"
        INSERT INTO "users" (id, email, name, "avatarUrl", "emailVerified", status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, now(), 'ACTIVE', now(), now())
        RETURNING id, email, "passwordHash", "emailVerified", name, "avatarUrl", "createdAt"
        "#,
    )
    .bind(id)
    .bind(email)
    .bind(name)
    .bind(avatar_url)
    .fetch_one(pool)
    .await
}

/// Fire-and-forget-ish insert matching `AuditService.log` — callers
/// should log the error and continue on failure rather than fail the
/// whole request over a missed audit row, same as the gateway's
/// intent (auditing must not be able to break auth).
#[allow(clippy::too_many_arguments)]
pub async fn insert_audit_log(
    pool: &Pool,
    id: &str,
    user_id: Option<&str>,
    event: &str,
    ip: Option<&str>,
    user_agent: Option<&str>,
    metadata: Option<serde_json::Value>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO "audit_logs" (id, "userId", event, ip, "userAgent", metadata, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, now())
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(event)
    .bind(ip)
    .bind(user_agent)
    .bind(metadata)
    .execute(pool)
    .await?;
    Ok(())
}
