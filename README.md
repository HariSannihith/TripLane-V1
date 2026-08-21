# TripLane

A collaborative group trip planner. A group creates a trip, everyone suggests destinations
(searched through Google Places), each member gets **one vote**, and the organiser locks in the
winner — after which a live countdown runs to departure.

Built with the MERN stack and Tailwind CSS: React + JavaScript, React Router, Axios, Context API,
Node.js, Express, MongoDB/Mongoose, JWT, bcrypt and the Google Places API. No other frameworks.

---

## Features

| Area | What it does |
| --- | --- |
| **Authentication** | Register / sign in with email + password. Passwords are bcrypt-hashed (cost 12) and never leave the database. JWT is stored client-side and attached by an Axios interceptor. |
| **Protected routes** | `/dashboard` and `/groups/:id` require a valid session. A stored token is verified before the router renders, so a refresh on a deep link never bounces you to the login page. Signed-in users are kept off `/login` and `/register`. |
| **Dashboard** | Every trip you belong to, with status filters, per-trip counters and a "needs your vote" nudge. |
| **Groups** | Create a trip with a travel window, budget range and currency. Join with a 6-character invite code (case-insensitive). |
| **Currency** | Each trip is priced in a currency the organiser picks from 39 supported options. It defaults to the currency implied by the browser's locale (an `en-IN` browser gets INR, not dollars), and every amount in that trip — budgets, cost estimates, activity costs, totals — is formatted with it. |
| **Members & authorization** | Organiser can edit settings, remove members and delete the trip. Members can leave. Non-members get a 404 — group existence is never leaked. |
| **Trip suggestions** | Search real destinations through Google Places (server-side proxy), or add one manually. Each carries a cost estimate, dates and notes. |
| **Budget & dates** | Every suggestion is scored against the group budget (`Within budget` / `Over budget` / `Under budget`) in the trip's currency, and shows trip length in nights. |
| **Activities** | A day-by-day itinerary per destination. Activity costs roll into that destination's total. |
| **Voting** | One vote per member per group. Voting again for the same place is rejected; voting for a different place *moves* your vote instead of adding one. Enforced by a unique index, so duplicates are impossible even under a race. |
| **Tie handling** | If two or more destinations share the top count, finalising is blocked with `409 TIE` and the organiser must explicitly pick one of the tied leaders. |
| **Final selection** | The organiser locks in the winner; the group's dates follow the winning proposal. Voting and edits close. Voting can be reopened. |
| **Countdown** | A live, per-second countdown to departure, which switches to "trip underway" / "trip wrapped up" as the dates pass. |
| **Activity feed** | An append-only log of every action in the group — joins, suggestions, votes, tie-breaks, finalisation. |

---

## Project structure

```
TripLane/
├── server/                     # Express + Mongoose REST API
│   ├── .env.example
│   └── src/
│       ├── config/             # env loading + Mongo connection
│       ├── models/             # User, Group, Suggestion, Vote, Activity
│       ├── middleware/         # auth, group access, validation, error handling
│       ├── controllers/        # request handlers (thin)
│       ├── services/           # places, voting tallies, activity log (logic)
│       ├── routes/             # REST routing + express-validator rules
│       ├── utils/              # ApiError, asyncHandler, presenters, tokens
│       ├── app.js              # express app (middleware chain)
│       └── server.js           # bootstrap: connect DB, listen, graceful shutdown
└── client/                     # React + Vite + Tailwind
    └── src/
        ├── api/                # Axios instance + endpoint wrappers
        ├── context/            # AuthContext, ToastContext
        ├── hooks/              # useCountdown
        ├── components/
        │   ├── ui/             # Button, Input, Modal, Badge, Avatar, …
        │   ├── layout/         # Navbar, AppLayout, route guards
        │   └── group/          # workspace pieces (voting, members, feed, …)
        ├── pages/              # Landing, Login, Register, Dashboard, GroupWorkspace
        └── utils/              # formatting helpers
```

**Layering:** routes validate → middleware authorises → controllers orchestrate → services hold the
logic → presenters shape the JSON. Controllers never build response objects by hand, so every
endpoint returns the same field names.

---

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

### 1. Install

```bash
npm run install:all
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no | API port, defaults to `5000`. |
| `NODE_ENV` | no | `development` (default) or `production`. |
| `MONGO_URI` | **yes** | e.g. `mongodb://127.0.0.1:27017/triplane`. The server exits at startup if this is missing. |
| `JWT_SECRET` | **yes** | Long random string. Generate one with the command below. |
| `JWT_EXPIRES_IN` | no | Token lifetime, defaults to `7d`. |
| `CLIENT_ORIGIN` | no | Comma-separated allowed origins, defaults to `http://localhost:5173`. |
| `GOOGLE_PLACES_API_KEY` | no | See [Google Places](#google-places) below. |

Generate a signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Run both processes

In one terminal:

```bash
npm run dev:server
```

In another:

```bash
npm run dev:client
```

The app is at **http://localhost:5173**. Vite proxies `/api` to the API on port 5000, so no API
host is baked into the frontend bundle.

---

## Google Places

Destination search runs entirely **server-side**. The browser calls `/api/places/search`, the
server calls Google, and photos are streamed back through `/api/places/photo` — the API key is
never exposed to the client and never appears in a URL the browser can see.

To enable live results, create a key in Google Cloud with **Places API (New)** enabled and set
`GOOGLE_PLACES_API_KEY` in `server/.env`.

**Without a key the app still works.** Search falls back to a built-in catalogue of twelve
destinations, and responses are marked `source: "fallback"` so the UI can say so. This keeps the
project runnable for review without requiring a billing-enabled Google account. Photos are the one
feature that needs a real key; fallback destinations render a gradient instead.

---

## API reference

All routes are prefixed with `/api`. Authenticated routes need `Authorization: Bearer <token>`.

### Auth

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account → `{ token, user }` |
| `POST` | `/auth/login` | Sign in → `{ token, user }` |
| `GET` | `/auth/me` | Current user (used to restore a session) |

### Groups

| Method | Route | Who | Description |
| --- | --- | --- | --- |
| `GET` | `/groups` | member | Trips you belong to |
| `POST` | `/groups` | any user | Create a trip |
| `POST` | `/groups/join` | any user | Join with `{ inviteCode }` |
| `GET` | `/groups/:groupId` | member | Full workspace: group, members, suggestions, tally, your vote |
| `PATCH` | `/groups/:groupId` | organiser | Update name, dates, budget, currency |
| `DELETE` | `/groups/:groupId` | organiser | Delete the trip and all its data |
| `POST` | `/groups/:groupId/leave` | member | Leave (organiser cannot) |
| `DELETE` | `/groups/:groupId/members/:userId` | organiser | Remove a member |
| `GET` | `/groups/:groupId/results` | member | Tally, leaders, members yet to vote |
| `POST` | `/groups/:groupId/finalize` | organiser | Lock in the winner (`{ suggestionId }` to break a tie) |
| `POST` | `/groups/:groupId/reopen` | organiser | Reopen voting |
| `GET` | `/groups/:groupId/activity` | member | Activity feed (`?limit=`) |

### Suggestions & votes

| Method | Route | Who | Description |
| --- | --- | --- | --- |
| `GET` | `/groups/:groupId/suggestions` | member | List with tally |
| `POST` | `/groups/:groupId/suggestions` | member | Propose a destination |
| `PATCH` | `/groups/:groupId/suggestions/:id` | author or organiser | Update cost, dates, notes |
| `DELETE` | `/groups/:groupId/suggestions/:id` | author or organiser | Remove it (and its votes) |
| `POST` | `/groups/:groupId/suggestions/:id/activities` | member | Add a planned activity |
| `DELETE` | `/groups/:groupId/suggestions/:id/activities/:activityId` | author or organiser | Remove an activity |
| `POST` | `/groups/:groupId/suggestions/:id/vote` | member | Cast or move your vote |
| `DELETE` | `/groups/:groupId/suggestions/:id/vote` | member | Withdraw your vote |

### Places

| Method | Route | Who | Description |
| --- | --- | --- | --- |
| `GET` | `/places/search?query=` | authenticated | Destination search |
| `GET` | `/places/:placeId` | authenticated | Place details |
| `GET` | `/places/photo?ref=` | public | Photo proxy (see note below) |

### Error format

Every failure returns the same shape, so the client can branch on `code` rather than parse text:

```json
{ "error": { "message": "The vote is tied. Choose one of the tied destinations to break it.",
             "code": "TIE",
             "details": { "leaders": ["…", "…"], "votes": 2 } } }
```

Codes used by the UI: `VALIDATION_ERROR` (with per-field `details`), `ALREADY_MEMBER`,
`DUPLICATE_VOTE`, `TRIP_FINALIZED`, `NO_VOTES`, `TIE`, `DUPLICATE`.

---

## Data model

```
User ──owns──> Group ──has many──> Suggestion ──embeds──> PlannedActivity
                 │                      │
                 ├──members[]───────────┤
                 │                      │
                 └──has many──> Vote ───┘   (unique on {group, user})
                 │
                 └──has many──> Activity    (append-only feed)
```

Decisions worth knowing:

- **One vote per member per group**, not per suggestion. A unique index on `{group, user}` makes a
  second vote impossible at the database level; casting a vote elsewhere moves the existing one.
  This keeps the tally meaningful (percentages always sum to 100%).
- **One suggestion per place per group** — a partial unique index on `{group, placeId}` stops the
  same destination being proposed twice and splitting its vote. Manual entries (no `placeId`) are
  exempt.
- **Deleting a group cascades** to its suggestions, votes and activity entries, so nothing outlives
  its parent.
- **Removing a member or a suggestion discards the affected votes**, keeping the tally honest.
- **Passwords use `select: false`** so a hash cannot leak through a careless query.
- **Currency lives on the group, not the user.** Everyone splitting one budget has to read the same
  numbers, so the trip is denominated once by its organiser. The code is validated against
  `server/src/utils/currencies.js` (mirrored in `client/src/utils/currencies.js` for the picker), so
  a typo can never reach the database. Amounts are stored as plain numbers: switching currency
  relabels them, it does not convert them — there is no exchange-rate lookup.

---

## Security notes

- bcrypt hashing (cost 12); login returns the same message for unknown email and wrong password, so
  the endpoint cannot be used to enumerate accounts.
- JWT verified on every protected request, with the user re-loaded from the database — a deleted
  account's token stops working immediately.
- Authorization is enforced server-side on every group route, not just hidden in the UI.
  Non-members receive `404`, so group existence is not leaked.
- `helmet` security headers, a strict CORS allow-list, and a 100 kB JSON body cap.
- Rate limiting: 300 req/min globally, 60/min on Places (it is billed per call), and 20 per 15 min
  on auth in production (looser in development so seeding does not trip it).
- Input validated twice: `express-validator` on the way in, Mongoose schema constraints at the
  database boundary. The client mirrors the same rules for instant feedback.
- The Google API key stays server-side. The photo proxy is deliberately unauthenticated because
  `<img src>` cannot send an `Authorization` header; it is safe because the photo reference format
  is strictly validated, the key never leaves the server, and the endpoint is rate limited.

---

## Testing

The API was exercised end-to-end against a live server and MongoDB — 93 assertions covering
registration and login, token rejection, invite codes, member/non-member/organiser authorization,
suggestions, activities, voting, duplicate-vote rejection, vote moving, tie detection, tie-breaking,
finalisation, reopening, the activity feed, membership changes and cascade deletion. The frontend
flows (register → dashboard → workspace → tie-break → finalise → countdown) were driven in a real
browser, and database integrity (no orphans, hashed passwords, unique indexes) was verified directly
in MongoDB.

---

## Known limitations

- Editing a suggestion is available on the API (`PATCH`) but has no UI — remove and re-add instead.
- There is no currency conversion. A trip has one currency, and changing it relabels existing
  amounts rather than converting them (the settings dialog says so before you save). Per-member
  display currencies would need a live exchange-rate feed.
- The workspace refreshes on your own actions; other members' changes appear on your next load
  rather than in real time (no websockets).
- There is no password reset or email verification flow.
