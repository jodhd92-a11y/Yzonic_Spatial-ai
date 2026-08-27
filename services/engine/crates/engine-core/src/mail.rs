//! DELIBERATE DEVIATION from the gateway's `mail.service.ts`: this always
//! logs the OTP to engine-core's own stdout instead of calling Resend
//! (or any provider), regardless of `MAIL_PROVIDER` in the shared `.env`.
//!
//! Why: the gateway's real Resend integration needs an HTTP client
//! (reqwest + TLS stack) pulled in for a single call, external network
//! dependency during local dev/testing, and API-key handling — real cost
//! for a week-2 slice whose actual goal is proving the auth *logic* (password
//! hashing, token rotation, OTP verification) is faithfully ported. Console
//! logging is also strictly easier to test with: the code is right there
//! in the terminal, no inbox-checking or provider dashboard needed.
//!
//! This is not a design decision to defend forever — wiring real Resend
//! delivery here is a small, isolated follow-up (one HTTP POST) once the
//! auth logic itself is confirmed correct. Flagging it explicitly rather
//! than pretending it's already done.

pub fn log_otp_email(to: &str, code: &str, purpose: &str, expires_in_minutes: i64) {
    tracing::info!(
        to,
        purpose,
        expires_in_minutes,
        "[console-mail] OTP code: {code} (expires in {expires_in_minutes}m)"
    );
}
