# jieqi.dev

This directory is the complete standalone Jieqi project. Run commands from this
root, or explicitly from `site/` for frontend commands. Do not use the former
WordPress checkout as a source directory.

- `src/`, `scripts/`, `test/`: calendar API, content tooling and tests.
- `site/`: website, shared calendar code and public Widget. Preserve its Git history.
- `.jieqi-artwork/stamp-series-20260906/`: original stamp artwork and manifest.
- `.jieqi-artwork/complete-series-20260907/` and `style-samples-20260907/`:
  complete illustration collections, original PNGs and generation records.
- `docs/artwork-series-progress.json`: approved artwork and project-relative paths.
- `public/assets/` and `site/public/assets/`: published image assets.
- `data/`, `.env`: local private data; never commit or print secrets.
- `deploy/`: existing VPS deployment. Production lives at `/opt/jieqi` on the
  authorized server; the public site, API and static domains are unchanged.

Use paths relative to this project in artwork manifests. Keep historical image
generation provenance as provenance; published assets must have local originals.
Run `npm run check` and `npm test` at the root. In `site/`, run TypeScript checking,
lint and the Node-target production build described in `deploy/README.md`.
Do not republish the local database just to verify a relocation.
