# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Single entry; loads Matter.js (v0.19.0 CDN) and game scripts.
- `style.css`: Layout, mobile‑first styling, responsive rules.
- `game.js`: Core loop, physics (Matter.Engine), rendering, difficulty handling.
- `cats.js`: Cat definitions and helpers (`getRandomDropCat`, `getNextLevelCat`).
- `touch.js`: Touch/mouse controls and drop‑line overlay.
- `assets/`: Game art under `assets/cats/*.png`.

## Build, Test, and Development Commands
- Serve locally: `python3 -m http.server 8080` (open `http://localhost:8080`).
- Fast iteration: refresh the browser; no build step or bundler.
- Console check: use DevTools to ensure no red errors while playing.

## Coding Style & Naming Conventions
- **JavaScript**: 4‑space indent; semicolons; single quotes; `camelCase` variables/functions; `PascalCase` classes; `UPPER_SNAKE_CASE` constants (e.g., `DIFFICULTY_SETTINGS`).
- **CSS**: hyphen‑case class names; scope to `#game-container` where possible; keep rules mobile‑first.
- **Files**: lowercase names (`game.js`, `touch.js`); images live in `assets/cats/`.

## Testing Guidelines
- **Manual QA**: verify start/reset flow, drop cooldown, danger line, and score updates across easy/normal/hard.
- **Merging**: confirm equal‑level cats merge and max‑level merge effect triggers.
- **Assets**: temporarily rename an image to confirm emoji fallback works.
- **Performance**: target ~60 FPS; avoid heavy per‑frame allocations.

## Commit & Pull Request Guidelines
- History shows `add:` prefix; prefer Conventional Commits going forward: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- PRs include purpose, linked issues, before/after screenshots or a short screen recording, reproduction steps, and any risks.
- Keep diffs small; avoid unrelated refactors; compress new images.

## Security & Configuration Tips
- No secrets required; do not commit credentials.
- Pin third‑party versions (Matter.js is pinned) and test after upgrades.
- Ensure rights for any added art/audio; store under `assets/`.

