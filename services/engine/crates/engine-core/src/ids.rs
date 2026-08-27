//! Prisma's `@default(cuid())` is applied by the Prisma CLIENT (JS) at
//! insert time — there's no database-level default on these `id`
//! columns for engine-core to inherit. Since the column type is just
//! TEXT and nothing else in the schema parses or validates the cuid
//! format specifically, new rows engine-core creates use a v4 UUID
//! string instead of a real cuid. Existing rows keep their real cuid
//! ids untouched; this only affects rows engine-core itself inserts.
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
