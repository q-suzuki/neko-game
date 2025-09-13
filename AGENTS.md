# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: single entry; loads Matter.js `v0.19.0` via CDN and game scripts.
- `style.css`: layout and mobile‑first styling; scope to `#game-container`.
- `game.js`: core loop, `Matter.Engine` physics, rendering, difficulty handling.
- `cats.js`: cat definitions and helpers (`getRandomDropCat`, `getNextLevelCat`).
- `touch.js`: touch/mouse controls and drop‑line overlay.
- `assets/`: game art under `assets/cats/*.png` (compressed PNGs preferred).

## Build, Test, and Development Commands
- Serve locally: `python3 -m http.server 8080` then open `http://localhost:8080`.
- Fast iteration: refresh the browser; no build step or bundler.
- Console check: keep DevTools clean (no red errors while playing).

## Coding Style & Naming Conventions
- **JavaScript**: 4‑space indent; semicolons; single quotes; `camelCase` vars/functions; `PascalCase` classes; `UPPER_SNAKE_CASE` constants (e.g., `DIFFICULTY_SETTINGS`).
- **CSS**: hyphen‑case class names; scope rules to `#game-container`; mobile‑first.
- **Files**: lowercase filenames; images live in `assets/cats/`.

## Testing Guidelines
- **Manual QA**: verify start/reset flow, drop cooldown, danger line, and score updates across easy/normal/hard.
- **Merging**: confirm equal‑level cats merge and max‑level merge effect triggers.
- **Assets**: temporarily rename an image to confirm emoji fallback works.
- **Performance**: target ~60 FPS; avoid heavy per‑frame allocations.

## Commit & Pull Request Guidelines
- **Commits**: use Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`). Keep diffs focused; avoid unrelated refactors.
- **PRs**: include purpose, linked issues, before/after screenshots or a short recording, reproduction steps, and any risks.

## Security & Configuration Tips
- No secrets required; never commit credentials.
- Pin third‑party versions (Matter.js `0.19.0`) and test after upgrades.
- Ensure rights for any added art/audio; store under `assets/`.

