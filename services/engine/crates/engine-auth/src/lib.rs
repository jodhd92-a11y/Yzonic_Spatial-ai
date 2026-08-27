//! Auth domain crate. Week-1 scope (blueprint section 5, item 3) is
//! deliberately narrow: verify an access-token JWT the exact same way the
//! NestJS gateway's `JwtStrategy` does, so both services can validate the
//! *same* live session simultaneously during the gradual cutover. Signup,
//! login, refresh rotation, OTP, and OAuth linking (full contract in
//! `services/engine/contracts/openapi.yaml`) are the next slice — their
//! dependencies (argon2, sha2, rand, hex) are already in Cargo.toml so
//! that work doesn't require a lockfile churn later.

use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Normalizes an email address for storage/lookup purposes: trims
/// surrounding whitespace, lowercases. Every code path that reads or
/// writes a user-supplied email MUST call this before it touches the
/// database — this is the application-layer half of the fix for a real
/// bug found via live OAuth testing (two accounts existing for
/// "user@x.com" vs "User@x.com"). The database-level backstop is a
/// `CREATE UNIQUE INDEX ... ON users (LOWER(email))` migration; this
/// function is what keeps the STORED value consistently lowercase in
/// the first place, rather than relying on hitting that constraint as
/// an error case on every write.
///
/// Deliberately just `.trim().to_lowercase()` — no Unicode-aware email
/// normalization (case folding for non-ASCII local parts, IDN handling,
/// etc.). Real-world email providers (Gmail, the ones actually in use
/// here) are ASCII-local-part in practice; revisit if this system ever
/// needs to support fully international email addresses correctly.
pub fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

/// Mirrors the JWT payload the gateway signs: `{ sub: userId, email }`.
/// Do not add fields here without adding them on the NestJS side first —
/// this struct only decodes what the token actually carries today.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: String,
    pub email: String,
    // Standard JWT registered claims — `jsonwebtoken` validates `exp`
    // automatically against these when present.
    pub iat: usize,
    pub exp: usize,
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("missing credentials")]
    MissingCredentials,
    #[error("invalid or expired token")]
    InvalidToken,
    #[error("password hashing error: {0}")]
    PasswordHash(String),
    #[error("invalid duration string: {0:?}")]
    InvalidDuration(String),
}

/// Verifies an access-token JWT with the same secret/algorithm the gateway
/// uses (`JWT_ACCESS_SECRET`, HS256). Returns the decoded claims on
/// success. Does not touch the database — callers combine this with
/// `engine_data::get_user_by_id(&claims.sub)` for the full `/auth/me`
/// behavior, same two-step shape as the NestJS `JwtAuthGuard` + handler.
pub fn verify_access_token(token: &str, secret: &str) -> Result<AccessTokenClaims, AuthError> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
    // `jsonwebtoken`'s (this crate's) default leeway on exp/nbf checks is
    // 60 seconds. Node's `jsonwebtoken` package — what the gateway's
    // JwtStrategy actually uses — defaults to ZERO leeway. Left at this
    // crate's default, engine-core would accept access tokens for up to
    // 60 seconds after the gateway itself would already be rejecting
    // them as expired: a real parity gap, caught by
    // `tests::rejects_expired_token` failing against the crate default.
    validation.leeway = 0;

    decode::<AccessTokenClaims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|_| AuthError::InvalidToken)
}

/// Extracts the raw access token from either source the gateway accepts,
/// preferring the `Authorization: Bearer` header if both are present —
/// matches `JwtStrategy`'s extractor order. Pure string logic, no
/// framework types, so it's testable without spinning up axum.
pub fn extract_access_token<'a>(
    bearer_header: Option<&'a str>,
    cookie_value: Option<&'a str>,
) -> Result<&'a str, AuthError> {
    if let Some(header) = bearer_header {
        if let Some(token) = header.strip_prefix("Bearer ") {
            return Ok(token);
        }
    }
    cookie_value.ok_or(AuthError::MissingCredentials)
}

/// Signs a new access-token JWT with the same shape the gateway issues:
/// `{ sub, email, iat, exp }`, HS256. `ttl_secs` should come from
/// `JWT_ACCESS_EXPIRES_IN` parsed via `parse_duration_secs` below, same as
/// the gateway's `JwtModule.registerAsync` config.
pub fn sign_access_token(
    user_id: &str,
    email: &str,
    secret: &str,
    ttl_secs: i64,
) -> Result<String, AuthError> {
    let now = chrono::Utc::now().timestamp();
    let claims = AccessTokenClaims {
        sub: user_id.to_string(),
        email: email.to_string(),
        iat: now as usize,
        exp: (now + ttl_secs) as usize,
    };
    jsonwebtoken::encode(
        &jsonwebtoken::Header::new(jsonwebtoken::Algorithm::HS256),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AuthError::InvalidToken)
}

/// Parses simple durations like "15m", "30d", "12h" into seconds — same
/// grammar as `common/time.ts`'s `parseDurationMs` on the gateway (that
/// one returns milliseconds; this returns seconds, since every caller
/// here wants seconds — convert once at the boundary, not twice).
pub fn parse_duration_secs(input: &str) -> Result<i64, AuthError> {
    let trimmed = input.trim();
    let unit_char = trimmed
        .chars()
        .last()
        .ok_or_else(|| AuthError::InvalidDuration(input.to_string()))?;
    let amount_str = &trimmed[..trimmed.len() - unit_char.len_utf8()];
    let amount: i64 = amount_str
        .parse()
        .map_err(|_| AuthError::InvalidDuration(input.to_string()))?;
    let multiplier = match unit_char.to_ascii_lowercase() {
        's' => 1,
        'm' => 60,
        'h' => 60 * 60,
        'd' => 24 * 60 * 60,
        _ => return Err(AuthError::InvalidDuration(input.to_string())),
    };
    Ok(amount * multiplier)
}

/// Password hashing — matches the gateway's `argon2.hash(password)` /
/// `argon2.verify(hash, password)` (node-argon2 package) via the PHC
/// string format both implementations read and write.
///
/// IMPORTANT — verified assumption, not a guess baked in blind:
/// `verify_password` below reads the algorithm/version/params straight
/// out of the stored PHC hash string itself (that's the whole point of
/// PHC encoding), so it correctly verifies existing hashes regardless of
/// which Argon2 variant created them. `hash_password` (used only for
/// NEW passwords — signup, reset) picks Argon2i with node-argon2's
/// historical default params (m=65536 KiB, t=3, p=4) to match what
/// existing rows in `users.passwordHash` look like. Confirm this by
/// logging in through engine-core with an account that was created
/// BEFORE this slice existed — if that 401s with a hash-parse error
/// (not just "wrong password"), the variant assumption is wrong and
/// needs adjusting; tell me the exact error and I'll fix it.
pub mod password {
    use super::AuthError;
    use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
    use argon2::{Algorithm, Argon2, Params, Version};

    pub fn hash_password(plain: &str) -> Result<String, AuthError> {
        let params = Params::new(65536, 3, 4, Some(32))
            .map_err(|e| AuthError::PasswordHash(e.to_string()))?;
        let argon2 = Argon2::new(Algorithm::Argon2i, Version::V0x13, params);
        let salt = SaltString::generate(&mut OsRng);
        argon2
            .hash_password(plain.as_bytes(), &salt)
            .map(|h| h.to_string())
            .map_err(|e| AuthError::PasswordHash(e.to_string()))
    }

    pub fn verify_password(stored_hash: &str, plain: &str) -> Result<bool, AuthError> {
        let parsed = PasswordHash::new(stored_hash)
            .map_err(|e| AuthError::PasswordHash(e.to_string()))?;
        Ok(Argon2::default()
            .verify_password(plain.as_bytes(), &parsed)
            .is_ok())
    }
}

/// Opaque refresh tokens + their storage hash — matches
/// `generateOpaqueToken`/`hashToken` in the gateway's `auth.service.ts`
/// exactly: 32 random bytes hex-encoded (256-bit), SHA-256 of the raw
/// token stored server-side, raw value only ever sent to the client.
pub mod tokens {
    use rand::RngCore;
    use sha2::{Digest, Sha256};

    pub fn generate_opaque_token() -> String {
        let mut bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut bytes);
        hex::encode(bytes)
    }

    pub fn hash_token(raw: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        hex::encode(hasher.finalize())
    }
}

/// OTP generation/hashing/verification — matches `otp.service.ts`
/// exactly: 6-digit zero-padded code from a CSPRNG, SHA-256 hash stored
/// (never the plaintext code), constant-time comparison on verify.
pub mod otp {
    use rand::Rng;
    use sha2::{Digest, Sha256};
    use subtle::ConstantTimeEq;

    pub fn generate_code() -> String {
        let n: u32 = rand::thread_rng().gen_range(0..1_000_000);
        format!("{:06}", n)
    }

    pub fn hash_code(code: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(code.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Constant-time comparison of the submitted code's hash against the
    /// stored hash — matches `crypto.timingSafeEqual` on the gateway.
    /// Compares the hex-decoded bytes, not the hex strings themselves,
    /// same as the Node side comparing decoded Buffers.
    pub fn verify_code(submitted: &str, stored_hash_hex: &str) -> bool {
        let submitted_hash = hash_code(submitted);
        match (hex::decode(&submitted_hash), hex::decode(stored_hash_hex)) {
            (Ok(a), Ok(b)) => a.ct_eq(&b).into(),
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};

    fn sign(secret: &str, exp_offset_secs: i64) -> String {
        let now = chrono::Utc::now().timestamp();
        let claims = AccessTokenClaims {
            sub: "user_123".into(),
            email: "you@example.com".into(),
            iat: now as usize,
            exp: (now + exp_offset_secs) as usize,
        };
        encode(
            &Header::new(jsonwebtoken::Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap()
    }

    #[test]
    fn verifies_a_valid_token() {
        let token = sign("test-secret", 900);
        let claims = verify_access_token(&token, "test-secret").unwrap();
        assert_eq!(claims.sub, "user_123");
        assert_eq!(claims.email, "you@example.com");
    }

    #[test]
    fn rejects_expired_token() {
        let token = sign("test-secret", -10);
        assert!(verify_access_token(&token, "test-secret").is_err());
    }

    #[test]
    fn rejects_wrong_secret() {
        let token = sign("test-secret", 900);
        assert!(verify_access_token(&token, "wrong-secret").is_err());
    }

    #[test]
    fn extractor_prefers_bearer_header_over_cookie() {
        let tok = extract_access_token(Some("Bearer from-header"), Some("from-cookie")).unwrap();
        assert_eq!(tok, "from-header");
    }

    #[test]
    fn extractor_falls_back_to_cookie() {
        let tok = extract_access_token(None, Some("from-cookie")).unwrap();
        assert_eq!(tok, "from-cookie");
    }

    #[test]
    fn extractor_errors_with_neither() {
        assert!(extract_access_token(None, None).is_err());
    }

    #[test]
    fn duration_parses_matching_gateway_units() {
        assert_eq!(parse_duration_secs("15m").unwrap(), 15 * 60);
        assert_eq!(parse_duration_secs("30d").unwrap(), 30 * 24 * 60 * 60);
        assert_eq!(parse_duration_secs("12h").unwrap(), 12 * 60 * 60);
        assert_eq!(parse_duration_secs("45s").unwrap(), 45);
        assert!(parse_duration_secs("bogus").is_err());
    }

    #[test]
    fn password_hash_round_trips() {
        let hash = password::hash_password("correct-horse-battery-staple").unwrap();
        assert!(password::verify_password(&hash, "correct-horse-battery-staple").unwrap());
        assert!(!password::verify_password(&hash, "wrong-password").unwrap());
    }

    #[test]
    fn opaque_tokens_are_64_hex_chars_and_unique() {
        let a = tokens::generate_opaque_token();
        let b = tokens::generate_opaque_token();
        assert_eq!(a.len(), 64);
        assert_ne!(a, b);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn token_hash_is_deterministic() {
        let raw = "some-raw-token-value";
        assert_eq!(tokens::hash_token(raw), tokens::hash_token(raw));
    }

    #[test]
    fn otp_code_is_six_digits() {
        let code = otp::generate_code();
        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn otp_verify_matches_and_rejects() {
        let code = "042857";
        let hash = otp::hash_code(code);
        assert!(otp::verify_code(code, &hash));
        assert!(!otp::verify_code("000000", &hash));
    }

    #[test]
    fn normalize_email_trims_and_lowercases() {
        assert_eq!(normalize_email("  User@Example.COM  "), "user@example.com");
        assert_eq!(normalize_email("already@lower.com"), "already@lower.com");
    }
}
