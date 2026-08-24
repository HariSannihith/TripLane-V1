# Technical / design reasoning: short ID generation (URL shortener)

### Script (~60s)

The requirement is a unique short ID for every link. The constraint is that I
didn't want a database round trip on every single request.

So I use a counter, but I don't read it per request. Each server claims a block
of a thousand numbers with one atomic increment, then serves them from memory.
That's one database write per thousand links instead of one per link.

A raw counter is walkable though. Anyone can try one, two, three and scrape the
whole database. So I multiply the number by a large odd constant and mask it to
thirty-five bits. Odd is what makes it a bijection, so it stays collision-free
by construction, not by retrying on duplicates. Then base62 gives me six
characters.

What it costs me is dedup. The same URL submitted twice gets two different IDs.

And the scramble is obfuscation, not encryption. Two consecutive IDs leak the
constant. I know how I'd fix that if it mattered.

### They will follow up with

1. **Why not just use nanoid or a UUID?** — Random needs collision retries and
   a uniqueness check; yours is collision-free by construction. UUIDs are 36
   characters, yours is 6. Say you started on nanoid and replaced it.

2. **What happens if the server restarts mid-block?** — The rest of the block is
   discarded. Gaps are harmless, reuse would not be. That's exactly why the
   counter lives in Mongo and not in process memory.

3. **How would you fix the constant leaking?** — A Feistel network. Still a
   bijection so still collision-free, but genuinely unpredictable instead of a
   fixed offset an attacker can subtract out.

### Soft spots

- **You have not run this yet.** `services/idGenerator.js` doesn't exist and the
  controller still calls `nanoid(8)`. "Did you test it?" is a near-certain
  question. Wire it up, then run two checks: 100k IDs all distinct and all 6
  chars, and a restart test showing `seq` jumps to ~1001 rather than reusing 4.

- **"Odd makes it a bijection" needs a one-line why.** Be ready with: 2^35's only
  prime factor is 2, so every odd number is coprime with it, which makes it
  invertible. Don't say "bijection" if you can't follow with that.

- **No numbers anywhere in this answer.** Once it runs, "one write per thousand
  links" becomes something you measured rather than something you designed.

- **Concurrency.** If they ask what happens when two requests hit an empty block
  at once, the answer is the single-flight `refillPromise` — the second request
  awaits the first one's refill instead of burning a second block.
