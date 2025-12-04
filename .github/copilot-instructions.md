# Copilot / AI Agent Instructions for this Repo

This file gives focused, actionable guidance so an AI coding agent can be productive immediately in this Real Estate app repository.

**Big Picture:**
- **Architecture:** This is a two-part app: a React front-end in `client/` (Create React App) and an Express/MongoDB back-end in `server/` (MVC-style controllers, routes, models).
- **Dataflow:** The front-end calls REST endpoints under `/api/*` (see `client/src/services/api.js`) which are served by `server/routes/*` and handled in `server/controllers/*Controller.js`. MongoDB models live in `server/models/*.js` and the DB connection is in `server/config/db.js`.
- **Auth:** JWT-based auth is implemented (`jsonwebtoken`) with `bcryptjs` used for password hashing. Protect routes with `server/middleware/authMiddleware.js`.

**Where to start / key files:**
- Entry: `server/server.js` (starts Express, mounts routes, loads `.env`).
- Routes: `server/routes/*.js` (e.g., `authRoutes.js`, `propertyRoutes.js`, `userRoutes.js`).
- Controllers: `server/controllers/*.js` (business logic per route). Use controllers to change API behavior.
- Models: `server/models/Property.js` and `server/models/User.js` (Mongoose schemas).
- DB connect: `server/config/db.js` (calls `mongoose.connect`).
- Front-end API calls: `client/src/services/api.js` (single place where client constructs HTTP calls).
- Pages: `client/src/pages/*` (UI screens such as `Login.js`, `SignUp.js`, `Properties.js`).

**Run / dev workflow (observed):**
- Start server in dev: `cd server; npm install; npm run dev` (uses `nodemon`).
- Start client: `cd client; npm install; npm start` (CRA dev server at :3000).
- Production server: `cd server; npm start`.
- Note: the server reads `.env` via `dotenv`—set `PORT`, `MONGO_URI`, `JWT_SECRET` there.

**Project-specific conventions & patterns:**
- Server uses CommonJS (`require` / `module.exports`) and `type: "commonjs"` in `server/package.json`.
- Routing -> controller -> model flow: add a route in `server/routes`, implement handler in the matching controller, and use models under `server/models`.
- Authentication: protect routes by adding `authMiddleware` to route definitions (e.g., `router.get('/me', authMiddleware, controller.getMe)`).
- Client expects the API under `/api/*`. The repo uses a development proxy pattern (CRA dev server -> backend port 5000). Verify `client/package.json` or environment if requests fail.

**External dependencies & integration points:**
- MongoDB via `mongoose` — connection configured in `server/config/db.js`.
- JWT via `jsonwebtoken` for session/auth token management.
- `bcryptjs` for password hashing.
- `axios` on the client for HTTP calls (check `client/src/services/api.js`).

**Common change tasks — how to implement them here:**
- Add new API endpoint: add route in `server/routes/<resource>Routes.js`, add handler in `server/controllers/<resource>Controller.js`, if needed add/update `server/models/<Resource>.js`, and update `client/src/services/api.js` and UI under `client/src/pages`.
- Add protected endpoint: add `authMiddleware` to the route, return 401 on missing/invalid token.
- Fix UI to call API: adjust `client/src/services/api.js` and update the page in `client/src/pages`.

**Testing & debug notes (project-specific):**
- Client tests: use CRA test runner (`cd client; npm test`). No server tests found — run server locally with `npm run dev` and use Postman / curl.
- Logging: server uses console logging in `server.js` and controllers. Use `nodemon` for fast dev restarts.

**Style / commit hints for AI-generated changes:**
- Keep server code CommonJS style and don't migrate to ES modules.
- Keep controller functions focused: minimal side-effects, return standard HTTP codes and JSON bodies similar to existing controllers.
- When editing routes or controllers, update both server and client integration points (route path and client calls).

**Files referenced as examples:**
- `server/server.js` — app entry and route mounting.
- `server/controllers/*Controller.js` — controller pattern to copy.
- `server/models/User.js`, `server/models/Property.js` — Mongoose schema examples.
- `server/middleware/authMiddleware.js` — how auth tokens are expected.
- `client/src/services/api.js` — where to change client HTTP logic.
- `client/src/pages/Login.js`, `SignUp.js`, `Properties.js` — UI patterns for auth and listing properties.

If anything in this document is unclear or you'd like a different level of detail (more examples, sample patches, or a checklist for adding new features), tell me which section to expand and I'll iterate.
