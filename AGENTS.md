# AGENTS.md — Fusion Fables

> Last updated: 2026-03-03 | Node.js 18+ · Express 4.21 · Socket.IO 4.8 · Jest 29.7

## Commands (verified)

| Command | Purpose | ~Time |
|---------|---------|-------|
| `npm install` | Install dependencies | 30s |
| `npm start` | Start server on port 3000 (or `$PORT`) | instant |
| `npm test` | Run full test suite (unit + integration) | 30–60s |
| `npm run test:unit` | Unit tests only (server + client) | 10s |
| `npm run test:integration` | Integration tests only | 20s |
| `npm run test:coverage` | Tests + lcov/html coverage report | 60s |
| `npm run test:watch` | Watch mode for TDD | — |

Tests run **serially** (maxWorkers: 1) to avoid port conflicts. Timeout: 15s per test.

## File Map

```
src/server.js          → Express + Socket.IO server; all game logic
public/index.html      → Lobby page (player name input)
public/game.html       → Game board (chat, turn display, buttons)
public/about.html      → About page
public/script.js       → Lobby: name input, cookie storage, redirect
public/gamescript.js   → Game: socket client, masking logic, UI state
public/styles.css      → Custom styles (overrides Bootstrap 5.3.2)
tests/unit/server/     → validateMessage + gameState tests
tests/unit/client/     → masking + escapeHtml tests (jsdom env)
tests/integration/     → connection, gameFlow, messageRouting, turns
tests/helpers/         → testServer.js (random port), socketClient.js
jest.config.js         → Dual env: node (server) + jsdom (client)
src/dev.env            → PORT=8080 for local dev (not loaded automatically)
```

## Architecture

Single-file server with module-scoped game state. No database. No build step.

```
Client (Browser)
  └─ Socket.IO ──→ src/server.js
                    ├─ Express (static: public/)
                    ├─ validateMessage() — trim + length limits
                    ├─ createGameServer() — factory for testability
                    └─ gameBeginnings[] — 25 story prompts (exported)
```

**Game state** lives in `server.js` module scope: `connectedClients[]`, `isInGame`, `storedMessages[]`, `currentTurnIndex`.

## Key Patterns

**Server exports for testing:**
```js
// src/server.js — test-safe factory pattern
export function createGameServer(options = {}) { ... }
export function validateMessage(data) { ... }
export const gameBeginnings = [...];
```

**Message masking rule (gamescript.js):**
- Own message → display as "You"
- Previous player's message → show unmasked
- All other players → mask with asterisks `***`

**XSS prevention:** Use `div.textContent = text; return div.innerHTML;` — never `innerHTML = userInput`.

## Heuristics

| When | Do |
|------|----|
| Adding socket events | Handle in `server.js`, emit typed events, test in `integration/` |
| Changing masking logic | Edit `gamescript.js`, add cases to `tests/unit/client/masking.test.js` |
| Adding validation rules | Edit `validateMessage()` in `server.js`, add to `validateMessage.test.js` |
| Testing with 3 clients | Use `helpers/socketClient.js` + `testServer.js` in integration tests |
| Need test isolation | Use `resetGameState()` in `afterEach` |
| Port conflicts in tests | Already handled — `testServer.js` allocates random port |

## Boundaries

**Always:**
- Sanitize user input through `validateMessage()` before broadcasting
- Use `escapeHtml()` before inserting any user content into DOM
- Use `createGameServer()` factory in tests — never import bare server

**Ask first:**
- Changing the 3-player minimum for game start
- Modifying `storedMessages` structure (breaks end-game display)
- Adding persistent state (currently stateless by design)

**Never:**
- Set `innerHTML` directly with user-supplied strings
- Import `src/server.js` as a singleton in tests (breaks test isolation)
- Run integration tests in parallel (causes port conflicts)

## Codebase State

- No CI/CD pipeline — tests run manually only
- No environment file auto-loading — set `PORT` manually or use default 3000
- `src/dev.env` is not `.env` — not loaded by dotenv automatically
- Coverage threshold: 50% (statements/branches/functions/lines)
- External CDN dependencies: Bootstrap 5.3.2, Socket.IO 4.8.1 client, js-cookie 3.0.5
