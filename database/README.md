## SQL workflow

- Use `fullupdate.sql` for a fresh Supabase project or a full rebuild.
- Use the dated files in `updates/` for incremental schema changes.
- Keep adding one new SQL file per database-affecting update so deployment stays copy-paste friendly.
