# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese "Cat Drop Game" (ネコゲーム) inspired by Suika Game mechanics. Players drop cats that merge when identical levels collide, creating larger cats and earning points.

## Development Commands

### Serving the Game
```bash
python3 -m http.server 8080
# Then open http://localhost:8080
```

### Development Workflow
- No build step required - direct browser refresh for testing
- Use browser DevTools console to check for errors during gameplay
- Test all difficulty levels (easy/normal/hard) and merge mechanics

## Architecture Overview

### Core Architecture Pattern
The game follows a modular JavaScript architecture with clean separation of concerns:

- **Main Game Loop** (`CatDropGame` class): Physics simulation, rendering, game state
- **Data Layer** (`cats.js`): Cat definitions, merge logic, weighted random selection
- **Input Layer** (`touch.js`): Touch/mouse input handling with visual feedback
- **View Layer** (`style.css`): Mobile-first responsive design

### Key Technical Components

**Physics Engine Integration**
- Uses Matter.js v0.19.0 for realistic physics simulation
- Physics bodies created for cats and boundaries
- Collision detection drives merge mechanics

**Difficulty System**
```javascript
DIFFICULTY_SETTINGS = {
  easy:    { dangerLinePercent: 0.10, maxDropLevel: 3, dropWeights: {1:6, 2:4, 3:2} },
  normal:  { dangerLinePercent: 0.15, maxDropLevel: 4, dropWeights: {1:6, 2:4, 3:3, 4:2} },
  hard:    { dangerLinePercent: 0.25, maxDropLevel: 5, dropWeights: {1:6, 2:4, 3:3, 4:2, 5:1} },
  paradise:{ dangerLinePercent: 0.30, maxDropLevel: 5, dropWeights: {1:8, 2:5, 3:3, 4:2, 5:1} }
}
```
`getRandomDropCat(maxLevel, weightsOverride)` は `weightsOverride` が指定された場合、難易度ごとの重みを用いてドロップを決定します（上限 `maxDropLevel` 以内のみ）。

**Cat Progression System**
- 7 cat levels with weighted random selection for drops
- Only cats with `weight > 0` can be dropped
- Levels 6-7 only obtainable through merging
- Special handling for max-level cat merging (disappear with bonus points)

**Mobile-First Touch Controls**
- Drag to position, release to drop
- Visual drop line indicator
- Prevents default touch behaviors (scroll, zoom, double-tap)
- Mouse events for desktop testing

### Image System
- Images loaded from `assets/cats/cat[1-7].png`
- Graceful fallback to emoji if images fail to load
- Images are clipped to circles and rotate with physics

## File Structure

```
/
├── index.html          # Main entry point, loads scripts and styles
├── game.js            # Core game logic, physics, rendering
├── cats.js            # Cat data definitions and helper functions
├── touch.js           # Touch/mouse input controller
├── style.css          # Mobile-first responsive styling
└── assets/cats/       # Cat images (optional, emoji fallback)
```

## Code Conventions

**JavaScript Style**
- 4-space indentation
- camelCase for variables/functions
- PascalCase for classes (`CatDropGame`, `TouchController`)
- UPPER_SNAKE_CASE for constants (`DIFFICULTY_SETTINGS`, `CAT_DATA`)
- Semicolons required

**CSS Style**
- hyphen-case for class names
- Mobile-first responsive design
- Scoped to `#game-container` where possible

**Commit Convention**
- Existing history uses `add:` and `fix:` prefixes
- Prefer Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`

## Testing Strategy

**Manual Testing Checklist**
- Start screen → difficulty selection → game start flow
- Drop mechanics and cooldown timing
- Cat merging for all combinations
- Game over trigger when cats cross danger line
- Score tracking and best score persistence
- Reset/retry functionality

**Performance Testing**
- Target 60 FPS during gameplay
- Test with many cats on screen
- Verify smooth physics simulation

**Asset Testing**
- Test with and without cat images in `assets/cats/`
- Verify emoji fallback works correctly

## Key Game Mechanics

**Merge System**
- Same-level cats merge into next level when colliding
- Max-level cats (Lv7) disappear when merging, giving bonus points
- Merge position calculated as midpoint between colliding cats

**Scoring**
- Each cat level has predetermined score value
- Score increases with each successful merge
- Best score persisted in localStorage

**Game Over Condition**
- Triggered when settled cats (low velocity) cross danger line
- Danger line position varies by difficulty

## Common Development Tasks

**Adding New Cat Levels**
1. Update `CAT_DATA` array in `cats.js`
2. Add corresponding CSS classes for colors
3. Update max level logic in merge functions

**Modifying Difficulty**
1. Adjust values in `DIFFICULTY_SETTINGS`
2. Update danger line positioning
3. Test drop cooldown and gravity changes

**Visual Effects**
- Merge effects implemented in `showMergeEffect()` and `showMaxLevelMergeEffect()`
- Canvas-based particle system for visual feedback
