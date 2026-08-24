# Project: TripLane — full walkthrough

_Solo project · built and tested, not deployed · works for product SDE and service-company rounds_

### Script (~70s)

Planning a trip in a group chat never converges. People suggest places, nobody tracks the cost, and the decision drifts.

So I built TripLane, solo and full stack. React and Tailwind on the front, Express and MongoDB behind it, with JWT auth. One person creates a trip with a budget range and dates, then shares a six-character invite code. Members join with that code, suggest real destinations through the Google Places API, and vote.

The decision I spent longest on was the voting model. The obvious version is one vote per suggestion. I went with one vote per person per trip, because that makes the percentages mean something. Sixty-seven percent means two of three members chose it, not that everyone approved everything.

It isn't deployed. But I tested it end to end against a real database — a hundred and eighteen checks across auth, permissions, voting and the delete cascades.

What I find most interesting is what the system does when the vote ties.

### They will follow up with

1. **"So what does happen on a tie?"** — The API refuses to guess. It returns a 409 with the tied destinations listed, and the organiser has to pick one of them explicitly. Your line: _"the software never invents a decision the group didn't make."_
2. **"How do you stop someone voting twice?"** — Two layers. The controller returns a friendly 409 for the normal case, but the real guarantee is a unique index on group plus user, so even two simultaneous requests can't create a second vote. Your line: _"a check-then-write is a race unless the database enforces it."_
3. **"How is the invite code generated? Could two trips get the same one?"** — Six characters from a 32-character alphabet with 0, O, 1 and I removed so it can be read aloud. Drawn from crypto.randomBytes, about 1.07 billion combinations. Collisions can't persist because the field has a unique index, and creation retries up to five times on a duplicate.

### Soft spots

- **"A hundred and eighteen checks."** Be ready for "what kind of tests?" These are integration tests against a live server and database — not unit tests, and there's no CI. Say that before they dig it out. If they ask for a coverage percentage, you don't have one; say so and say what you'd unit-test first (the vote tally and tie logic).
- **The Google Places demo.** There's no API key in `server/.env` right now, so a live demo shows the twelve built-in fallback destinations, not Google results. Either add the key before you interview, or state up front that it falls back by design so the project runs without a billing account.
- **"Solo, full stack."** The claim isn't the defence — depth is. Be able to open `voteController.js` and walk the duplicate-vote race live, then show the unique index in `Vote.js` that makes it safe.

### Notes

- Don't recite the whole login → create → join → vote → logout chain unprompted. It's a list, and lists lose the room. Give the 70-second script, then let the follow-ups pull the detail out of you.
- If they ask you to walk the full flow explicitly, trace **one request** end to end instead — a vote going from button click through the middleware chain to the unique index. Same knowledge, far better delivery.
