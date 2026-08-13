// Supabase connection config.
//
// The anon/public key below is SAFE to ship in client-side code — it is
// designed to be public. Access control is enforced server-side by the
// Row Level Security policies in sql/schema.sql, not by hiding this key.
// NEVER put the service_role key in this file or anywhere under public/ —
// that key bypasses RLS entirely and belongs only in the import script's
// environment variable (see scripts/import_users_from_excel.py).
//
// Fill these in from Supabase → Project Settings → API.
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
