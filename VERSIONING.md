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
