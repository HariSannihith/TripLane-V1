# Fundamentals question bank — MERN

Companion to `docs/TripLane_Interview_Guide.pdf`.

- **The guide** answers questions about *your project* (39 of them).
- **This file** answers questions about *the technologies your project uses* — what service companies ask most.

Every answer ends with an **→ In TripLane** hook. Use it. Answering a textbook question and then landing it on your own code is the single biggest difference between a forgettable answer and a good one.

---

## 1. JavaScript

**What's the difference between `var`, `let` and `const`?**
`var` is function-scoped and hoisted as `undefined`. `let` and `const` are block-scoped and sit in a "temporal dead zone" until declared, so using them early throws instead of silently giving `undefined`. `const` can't be reassigned, but the contents of a `const` object or array can still change.
→ In TripLane: I use `const` almost everywhere and `let` only where a value genuinely gets reassigned, like the `payload` variable in `auth.js`.

**`==` vs `===`?**
`==` converts types before comparing, so `0 == '0'` is true. `===` compares type and value, so it's false. Always use `===` unless you deliberately want `== null` to catch both `null` and `undefined`.

**What is a closure?**
A function that remembers the variables from where it was defined, even after that outer function has returned.
→ In TripLane: `asyncHandler` is a closure — it takes `fn` and returns a new function that still has access to `fn` when Express calls it later.

**Callback hell, and how do you avoid it?**
Nested callbacks that drift rightward and get unreadable. Promises flatten it into `.then()` chains; `async/await` flattens it further so asynchronous code reads top-to-bottom like synchronous code.
→ In TripLane: every controller is `async/await`. No callbacks anywhere.

**`Promise.all` — what does it do, and when is it wrong?**
Runs promises concurrently and resolves when all finish. It rejects as soon as *any* one rejects, so use `Promise.allSettled` when you want the successes even if one fails.
→ In TripLane: `getGroup` runs four independent queries in `Promise.all` — suggestions, the vote tally, my vote, and who voted. Sequentially that's four round trips; concurrently it's about one.

**What is the event loop? How is Node single-threaded but still handles many users?**
JavaScript runs on one thread, but I/O — file reads, database calls, network requests — is handed off to the system and doesn't block. When it finishes, the callback is queued and the loop picks it up. So Node isn't doing many things at once; it's never sitting idle waiting.
→ In TripLane: while one request waits on MongoDB, the thread is free to start another. The workload is almost entirely I/O, which is exactly what Node suits.

**Difference between `null` and `undefined`?**
`undefined` means it was never assigned. `null` means it was deliberately set to nothing.
→ In TripLane: this bit me for real. `optional()` in express-validator skips `undefined` by default but not `null`, so clearing the trip dates — which sends `null` — was failing validation until I fixed it.

---

## 2. React

**What is React, and what problem does it solve?**
A library for building UIs out of components. You describe what the UI should look like for a given state, and React works out the DOM changes. You stop writing "find this element and update it" code.

**What is the virtual DOM?**
React keeps a lightweight JavaScript copy of the UI. On a state change it builds a new copy, diffs it against the old one, and applies only the differences to the real DOM. Touching the real DOM is slow; diffing objects in memory is cheap.

**Props vs state?**
Props are passed in from a parent and are read-only. State is owned by the component and can change. Props flow down; changes flow up through callbacks.
→ In TripLane: `SuggestionCard` takes the suggestion as a prop and calls `onVote` upward. It owns no vote state itself — the page does.

**What is a hook? Which have you used?**
A function that lets a function component use React features. I've used `useState`, `useEffect`, `useContext`, `useCallback`, `useMemo`, `useRef` and one custom hook.
→ In TripLane: `useCountdown` is my own — it takes a target date and returns days, hours, minutes, seconds, ticking once a second.

**Explain `useEffect` and its dependency array.**
It runs code after render. Empty array `[]` = once on mount. With values = re-runs when those change. No array = every render, which is usually a bug. Returning a function gives you cleanup.
→ In TripLane: `useCountdown` returns `clearInterval` so the timer dies when you navigate away, and it doesn't start an interval at all if the date has already passed.

**Why do lists need a `key`?**
It tells React which item is which between renders. Without stable keys React can reuse the wrong DOM node and you get scrambled or stale rows. Array index is a poor key when the list can reorder.
→ In TripLane: every list keys on the database `_id`.

**Controlled vs uncontrolled components?**
Controlled = React state is the source of truth, the input shows `value` and updates via `onChange`. Uncontrolled = the DOM holds the value and you read it with a ref.
→ In TripLane: every form is controlled, which is what lets me validate as you type and disable Submit.

**Context API vs Redux — when would you use each?**
Context passes a value down without prop-drilling. Redux is a full state container with actions, reducers and devtools. Context is right for a small amount of rarely-changing global state; Redux earns its boilerplate when state is large, changes often, or many parts of the app mutate it.
→ In TripLane: one genuinely global thing — the signed-in user — so Context. If I added cross-page caching I'd reach for React Query before Redux, because the real problem would be server-state caching.

**What causes a re-render?**
State change, prop change, parent re-rendering, or context value change.

**How do you optimise a slow React app?**
Measure first with the Profiler. Then `React.memo` for expensive components, `useMemo`/`useCallback` to keep references stable, keys correct, virtualise long lists, and code-split routes.

---

## 3. Node & Express

**What is Express middleware?**
A function with `(req, res, next)` that runs in the request pipeline. It can read or modify the request, end the response, or call `next()` to pass control along. Order matters — they run top to bottom.
→ In TripLane: `requireAuth` is middleware. It verifies the JWT, loads the user onto `req.user`, then calls `next()`. Every protected route reuses it instead of repeating the check.

**How does error-handling middleware differ?**
It takes **four** arguments — `(err, req, res, next)`. Express identifies it by arity and only calls it when something passes an error to `next()`.
→ In TripLane: one `errorHandler` at the end of the chain formats every failure into the same JSON shape. That's why no controller has a try/catch.

**What is REST?**
An architectural style: resources identified by URLs, standard HTTP verbs for actions, stateless requests, and meaningful status codes. `GET` reads, `POST` creates, `PATCH` partially updates, `PUT` replaces, `DELETE` removes.
→ In TripLane: `POST /api/groups/:groupId/suggestions/:suggestionId/vote` — nested because a vote has no meaning outside a suggestion inside a group.

**Which status codes do you use, and when?**
200 OK, 201 Created, 400 bad input, 401 not authenticated, 403 authenticated but not allowed, 404 not found, 409 conflict with current state, 500 server fault.
→ In TripLane: 409 does a lot of work — duplicate vote, already a member, trip already finalised, and a tied vote.

**What's the difference between 401 and 403?**
401 = I don't know who you are. 403 = I know who you are and you still can't.
→ In TripLane: a non-member gets **404**, not 403, deliberately — see the security section.

**What is CORS and why does it exist?**
Browsers block a page on one origin from reading responses from another origin unless the server opts in with the right headers. It protects users from a random site reading their logged-in data on your API.
→ In TripLane: CORS is restricted to an explicit allow-list from `CLIENT_ORIGIN`, not `*`. In dev, Vite proxies `/api` so there's no cross-origin call at all.

**What is `package.json` vs `package-lock.json`?**
`package.json` lists dependencies with version ranges. The lock file pins the exact resolved versions so every install produces an identical tree. Commit both.

**How would you handle an uncaught exception in production?**
Log it with full context, return a generic 500 without leaking internals, and alert. For truly unhandled rejections, log and restart the process under a supervisor — a process in an unknown state shouldn't keep serving.

---

## 4. MongoDB & Mongoose

**SQL vs NoSQL — when would you pick each?**
SQL gives a fixed schema, joins and strong transactions — good when data is highly relational and consistency is critical, like payments. Document databases store flexible, nested documents and scale horizontally more easily — good when data is naturally hierarchical and read together.
→ In TripLane: a suggestion embeds a variable-length itinerary and a group embeds its member list. Those are documents. **Be honest**: votes and memberships are genuinely relational, and Postgres would have given me transactions for free. That's the migration I'd consider first.

**Embedding vs referencing?**
Embed when the child is always read with the parent, is bounded in size, and isn't queried alone. Reference when you need to query it independently, it grows unbounded, or you need constraints on it.
→ In TripLane: activities are embedded in the suggestion. Votes are their own collection — because I need to aggregate them and put a **unique index** on them, which you can't do the same way inside an array.

**What is an index? What does it cost?**
A sorted structure that lets the database find documents without scanning the whole collection. It costs disk space and slows writes, since every insert must update the index too. Index what you filter and sort on, not everything.
→ In TripLane: seven indexes. `{group, user}` unique on votes is the important one — it's not for speed, it's a **correctness constraint**.

**What is aggregation?**
A pipeline of stages that transforms documents in the database — match, group, sort, project — instead of pulling rows into Node and looping.
→ In TripLane: the vote tally is `$match` by group then `$group` by suggestion with `$sum: 1`. One round trip, and the counting happens where the data is.

**What is Mongoose? Why not the raw driver?**
An ODM that adds schemas, validation, middleware hooks, population and typed queries on top of MongoDB.
→ In TripLane: the `pre('save')` hook is why a plaintext password can never be stored — hashing happens in the model, so no controller can bypass it.

**Does MongoDB support transactions?**
Yes, on replica sets, via sessions. Not on a standalone server.
→ In TripLane: honest gap — deleting a group cascades to suggestions, votes and activities as separate deletes with no transaction. A crash mid-way could orphan documents. On a replica set I'd wrap it in a session.

**What does `populate` do?**
Replaces a stored ObjectId reference with the actual document — Mongoose's join-ish convenience, executed as an extra query.
→ In TripLane: suggestions populate `createdBy` so the card can show who suggested it.

---

## 5. Authentication & security

**What is JWT? What's inside it?**
Three base64url parts joined by dots: header, payload, signature. The header says the algorithm, the payload holds claims, and the signature is the header and payload signed with a secret. Anyone can *read* a JWT — only the holder of the secret can *forge* one.
→ In TripLane: my payload is only `{ sub: userId }`. Nothing else, because anything I put in there is public and can go stale.

**JWT vs sessions?**
Sessions store state server-side and hand out an ID — easy to revoke, but the server must remember every session. JWTs are stateless and scale across servers without shared storage, but you can't easily revoke one before it expires.
→ In TripLane: stateless, which means I can run several API instances with no shared session store. The cost is that logout is client-side only.

**Hashing vs encryption?**
Encryption is two-way — with the key you get the original back. Hashing is one-way. Passwords must be hashed, never encrypted, so a database leak doesn't reveal them.

**Why bcrypt and not SHA-256?**
SHA is built to be fast, which is exactly wrong for passwords — fast means billions of guesses per second. bcrypt is deliberately slow and salted per user, so identical passwords give different hashes and brute force gets expensive. The cost factor is tunable as hardware improves.
→ In TripLane: cost 12, roughly a quarter-second per hash.

**What is a salt?**
Random data mixed into each password before hashing, so two users with the same password get different hashes and precomputed rainbow tables are useless. bcrypt generates and stores the salt inside the hash string.

**What is XSS?**
Getting your JavaScript to run on someone else's page, letting you read anything the page can — including tokens in localStorage. Defence: escape output, validate input, Content-Security-Policy.
→ In TripLane: React escapes by default, everything is validated, helmet sets the headers.

**What is CSRF?**
Tricking a logged-in user's browser into firing a request at your site. It works because browsers attach cookies automatically.
→ In TripLane: not applicable, because I use a bearer token rather than cookies — an attacker's page can't add my `Authorization` header. That's the flip side of the localStorage trade-off.

**What is SQL injection, and does it apply to MongoDB?**
Injecting query syntax through user input. Mongo has its own version — NoSQL injection — where an object like `{ $gt: "" }` is passed where a string was expected.
→ In TripLane: express-validator enforces types before anything reaches a query, and Mongoose casts to the schema type.

**How does HTTPS help?**
Encrypts traffic in transit, so a token can't be read off the wire on shared Wi-Fi, and verifies you're talking to the real server. Any bearer-token scheme is only as safe as the transport.

---

## 6. The three you've already drilled

**"Two people vote at the same instant for different destinations — what happens, and how do you know the tally is right?"**
Those two don't collide. The unique index is on group plus user, so two different people are two different keys — both succeed. The race only happens when the *same* person votes twice at once, say from two tabs: both see no existing vote, both try to insert, one wins, the other gets a duplicate-key error which I catch and turn into a vote move. And the tally can't drift, because I don't store a counter — I aggregate the votes collection at read time.

**"Why 404 instead of 403 for a non-member?"**
A 403 confirms the group exists — I'd be telling someone with no business knowing that this ID is real. So a non-member gets a 404, with the same status *and* the same message as a group that genuinely doesn't exist. Otherwise you could walk through IDs and map which trips are real. It's enforced in `requireGroupMember`, which every nested route runs.
*Pushback to expect — "isn't that security by obscurity?"* No: the authorization is still fully enforced either way. The 404 only avoids leaking metadata on top.

**"localStorage for the JWT — isn't that XSS-vulnerable?"**
Yes. Anything in localStorage is readable by any script on the page. An httpOnly cookie fixes that because JavaScript can't read it — but the browser then sends it automatically, which opens CSRF, so I'd need SameSite and a CSRF token. For this project I took the simpler option and hardened the input side instead. For production with real user data I'd use a short-lived access token in memory plus an httpOnly refresh token.

---

## 7. When you don't know

Don't bluff — security and system-design questions are often asked *specifically* to see whether you will.

> "I haven't gone deep on that one. What I do know is [the part you know]. My instinct is [reasoning], but I'd want to check before saying that with confidence."

You get credit for honesty and for reasoning out loud. You lose the room the moment you invent something and they follow up twice.
