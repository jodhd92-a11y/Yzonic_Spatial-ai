//! Vision domain — persistence only in phase 1 (blueprint section 4).
//! The client-side MediaPipe pipeline in apps/explorer is already
//! well-built and stays client-side; the actual gap is that captured
//! frames only live in memory/localStorage today. Phase-1 scope here:
//!
//!   1. `scans` table: id, userId, label, confidence, imageRef, createdAt
//!   2. POST /vision/scans  — accept a captured frame + detection result,
//!      upload to object storage, write the row.
//!   3. GET  /vision/scans  — paginated history.
//!
//! Not implemented yet — this crate is a placeholder so the workspace
//! layout matches section 5's structure; the migration + handlers are
//! the next slice of work after the week-1 auth/data/core deliverables
//! this commit focuses on. A server-side inference tier (the actual
//! reason engine-vision-ffi would ever compile) is explicitly phase 6,
//! not before.
