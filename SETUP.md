# Setup

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's up, go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon` `public` key
   - `service_role` key (keep this one secret)
3. Go to **Authentication → Providers** and make sure **Email** is enabled.
   Under **Authentication → Emails**, you can customize the invite / reset
   password email templates (optional).

## 2. Create the database schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the
contents of `sql/schema.sql`, and run it. This creates the `profiles` table
and its Row Level Security policies.

## 3. Wire up the client

Edit `public/js/supabase-client.js` and fill in:

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

Add your logo at `public/images/logo.png`.

Serve the `public/` folder with any static host (Netlify, Vercel, GitHub
Pages, or just `python -m http.server` locally from inside `public/` for
testing). Supabase Auth works from any origin you add under
**Authentication → URL Configuration → Site URL / Redirect URLs**.

## 4. Fill in the roster

Open `data/users_master.xlsx`. On the **Users** tab, fill in one row per
person (yellow columns only):

| User ID | Full Name | Email | Role | Department | Status |
|---|---|---|---|---|---|
| jsmith | Jane Smith | jane.smith@bestcast.com | Manager | Operations | Active |

- **User ID must equal Email** — the login page authenticates by email.
- Only `Active` rows get invited.

## 5. Run the import script

```bash
pip install -r requirements.txt
export SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
python scripts/import_users_from_excel.py
```

For each `Active` row without a Supabase UID yet, this:
- Creates the Supabase Auth user and **emails them an invite link** to set
  their own password (no password ever touches the spreadsheet or this
  script).
- Creates/updates their row in `public.profiles`.
- Writes the new Supabase UID + invite date back into the spreadsheet.

Re-run it any time the roster changes:
- Flip `Status` to `Inactive` and re-run to **ban** that account (their
  history is preserved, they just can't log in).
- Flip it back to `Active` and re-run to re-enable them.

## 6. Try it

Open `public/login.html`, sign in with an account you invited (after it's
set its password via the emailed link), and you should land on
`dashboard.html`. That page isn't included — point it at whatever your app's
landing page is, or create a minimal placeholder for now.

Self-service sign-ups via `public/signup.html` land in Supabase with
`status = 'Pending'` and can't log in until you set `Status = Active` for
them (either directly in Supabase's table editor, or by adding them to the
spreadsheet with `Status = Active` and re-running the import script).
