# Versioning, Build Numbering & Engineering Records

## Standing rules for every change

These apply to every change in this repo, regardless of branch:

1. **Bump `VERSION`** per the semantic versioning rules below.
2. **Update `public/docs/requirements.md`** if the change adds, removes or
   alters a capability. Requirements are written in INCOSE style: a single
   "shall" statement per requirement, unambiguous and verifiable.
3. **Update `public/docs/test-cases.md`** to match. A new requirement is
   not complete until at least one test case verifies it, and a changed
   behaviour means the affected cases change in the same commit.
4. **Log defects in `public/docs/bugs.md`** when found. When one is fixed,
   record the root cause, the correction applied, and the version the fix
   shipped in. Fixed entries stay in the register — they are not deleted.
5. **Add an entry to `public/CHANGELOG.md`** describing the change.

Documentation updated in a later commit than the behaviour it describes
drifts immediately, so it belongs in the same change.

---

# Versioning & Build Numbering

This applies to every change in this repo, regardless of which branch it
lands on.

## Version (`VERSION` file, shown in the footer as `vX.Y.Z`)

Standard [semantic versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — breaking change: something that previously worked now behaves
  incompatibly (e.g. changing what the "User ID" field means, removing a
  page, changing the auth model in a way that invalidates existing
  sessions/accounts).
- **MINOR** — new backward-compatible functionality (e.g. adding a new
  page, a new field on the roster, wiring up real Supabase auth).
- **PATCH** — backward-compatible bug fix or small tweak (e.g. the
  User ID input-type fix, a copy change, a style fix).

Whoever makes a change bumps `VERSION` (a single line, e.g. `1.2.3`) as
part of that change's commit/PR. This is manual and intentional — the
version number is a human judgment call about the nature of the change,
not something CI infers.

## Build number (footer as `Build #N`)

Fully automatic — **never hand-edit**. It's `github.run_number` from the
`Deploy public/ to GitHub Pages` workflow: a GitHub-managed counter for
that workflow that only ever increases, across every branch and trigger.
That guarantees "always greater than the last build" without any
bookkeeping on our side.

## Build date/time (footer)

Also automatic: the UTC timestamp captured by the deploy workflow at the
moment it runs, written into `public/js/build-info.js`.

## How it's wired

`.github/workflows/deploy-pages.yml` generates `public/js/build-info.js`
right before publishing, overwriting the placeholder committed to git:

```js
window.BUILD_INFO = { version: "1.2.3", buildNumber: 42, buildDate: "2026-08-15 14:03 UTC" };
```

`public/js/footer.js` reads that global and renders it into every
`<p class="build-footer">` element on the page.
