// Turns the artifact fragment (docs/interview-guide.html) into a standalone,
// print-ready document: forced light theme, every Q&A expanded, a cover page,
// a contents page, and pagination rules. The artifact stays the source of truth.
import fs from 'node:fs';

const SRC = 'C:/Users/haris/OneDrive/Desktop/TripLane/docs/interview-guide.html';
const OUT = 'C:/Users/haris/AppData/Local/Temp/claude/C--Users-haris-OneDrive-Desktop-TripLane/97c1abad-d354-4a3d-a4cc-868ba894c636/scratchpad/print.html';

const raw = fs.readFileSync(SRC, 'utf8');

const bodyStart = raw.indexOf('<div class="stripe"');
const head = raw.slice(0, bodyStart);
let body = raw.slice(bodyStart);

// Every answer must be visible on paper — a closed <details> prints as just its
// summary, and Chrome hides the contents with more than `display`.
body = body.replace(/<details class="q">/g, '<details class="q" open>');

// The on-screen masthead is replaced by a proper cover page.
const mastheadStart = body.indexOf('<header class="masthead">');
const mastheadEnd = body.indexOf('</header>', mastheadStart) + '</header>'.length;
body = body.slice(0, mastheadStart) + body.slice(mastheadEnd);

// Only the API tables lead with a METHOD column; tag them so print-specific
// column widths apply there and nowhere else.
body = body.replace(/<table>(\s*<thead>\s*<tr><th>Method<\/th>)/g, '<table class="route-t">$1');

// Pull the section titles straight out of the markup so the contents page can
// never drift from the document.
const toc = [];
const sectionRe = /<section id="(s\d+)">\s*<p class="sec-no">(\d+)<\/p>\s*<h3>([^<]+)<\/h3>/g;
let m;
while ((m = sectionRe.exec(body)) !== null) {
  toc.push({ id: m[1], no: m[2], title: m[3].replace(/&amp;/g, '&') });
}

const partFor = (n) => (n <= 8 ? 'I — The build' : n <= 17 ? 'II — Q&amp;A' : 'III — Reference');

const cover = `
<div class="frontmatter">
<div class="cover">
  <div class="cover-bars" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </div>
  <div class="cover-body">
    <p class="cover-kicker">Interview Preparation Guide</p>
    <h1 class="cover-title">TripLane</h1>
    <p class="cover-sub">Collaborative Group Trip Planner</p>
    <p class="cover-rule"></p>
    <p class="cover-meta">
      Architecture Diagrams &nbsp;·&nbsp; Full Route Reference<br>
      Database Model &nbsp;·&nbsp; Expected Interview Q&amp;A
    </p>
    <p class="cover-stack">
      Full-Stack MERN Project<br>
      React 18 · Express · MongoDB · Node.js · Tailwind CSS
    </p>
  </div>
  <div class="cover-bars" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </div>
</div>

<div class="contents">
  <h2 class="contents-h">Contents</h2>
  <table class="contents-t">
    <tbody>
      ${toc
        .map(
          (t) => `<tr><td class="c-no">${t.no}</td><td class="c-title">${t.title}</td><td class="c-part">Part ${partFor(
            Number(t.no)
          )}</td></tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>
  <p class="contents-note">
    Every answer in Part II ends with the file path where that behaviour lives in the repository.
  </p>
</div>
</div>
`;

const printCss = `
<style>
  /* ---------- paged media ---------- */
  @page { size: A4; margin: 15mm 0 17mm 0; }

  html, body { background: #FFFFFF !important; }
  body { font-size: 10.6pt; line-height: 1.55; }

  .shell { display: block !important; max-width: none; padding: 0 17mm 0 17mm; }
  nav.toc { display: none !important; }
  main { padding-top: 0; }
  footer { display: none; }
  body > .stripe { display: none !important; }

  /* ---------- cover ---------- */
  .frontmatter { padding: 0 17mm; }
  .cover {
    break-after: page;
    height: 243mm;
    display: flex; flex-direction: column; justify-content: space-between;
    background: #0C1A22; color: #F2F7F9;
    margin: 0; padding: 0; overflow: hidden; border-radius: 2mm;
  }
  .cover-bars { display: flex; height: 7mm; }
  .cover-bars span { flex: 1; }
  .cover-bars span:nth-child(1) { background: #0B6E8A; }
  .cover-bars span:nth-child(2) { background: #1C6B4C; }
  .cover-bars span:nth-child(3) { background: #C98A2E; }
  .cover-bars span:nth-child(4) { background: #3D6E85; }
  .cover-body { padding: 0 18mm; }
  .cover-kicker {
    font: 600 10pt/1 "IBM Plex Mono", monospace; letter-spacing: .22em;
    text-transform: uppercase; color: #7FCBE2; margin: 0 0 10mm;
  }
  .cover-title {
    font: 700 46pt/1 "Archivo", sans-serif; letter-spacing: -.02em;
    margin: 0; color: #FFFFFF;
  }
  .cover-sub {
    font: 500 15pt/1.3 "IBM Plex Sans", sans-serif; color: #B7CCD7;
    margin: 4mm 0 0;
  }
  .cover-rule { border-top: 2px solid #2C4A5B; margin: 12mm 0; padding: 0; }
  .cover-meta { font: 400 11pt/1.7 "IBM Plex Sans", sans-serif; color: #D6E4EB; margin: 0; }
  .cover-stack {
    font: 400 9.5pt/1.6 "IBM Plex Mono", monospace; color: #7E9BAA; margin: 14mm 0 0;
  }

  /* ---------- contents ---------- */
  .contents { break-after: page; padding-top: 4mm; }
  .contents-h {
    font: 700 24pt/1 "Archivo", sans-serif; margin: 0 0 6mm;
    padding-bottom: 4mm; border-bottom: 2px solid #0B6E8A; color: #0C1A22;
  }
  .contents-t { width: 100%; border-collapse: collapse; min-width: 0; }
  .contents-t td { padding: 2.6mm 0; border-bottom: 1px solid #E2EAEE; vertical-align: baseline; }
  .c-no {
    width: 14mm; font: 600 10pt "IBM Plex Mono", monospace; color: #0B6E8A;
  }
  .c-title { font: 500 11pt "IBM Plex Sans", sans-serif; color: #0C1A22; }
  .c-part {
    text-align: right; white-space: nowrap;
    font: 400 8.5pt "IBM Plex Mono", monospace; color: #6C818E;
  }
  .contents-note {
    margin-top: 8mm; font: 400 9.5pt/1.6 "IBM Plex Sans", sans-serif; color: #566B78;
  }

  /* ---------- flow control ---------- */
  .part { break-before: page; border-top-width: 3px; margin-top: 0; padding-top: 0; }
  section { break-before: page; padding-top: 2mm; }
  .part + section { break-before: avoid; padding-top: 7mm; }

  .q, figure, .note, .card, .scroll { break-inside: avoid; }
  pre { break-inside: auto; }
  tr, h3, h4 { break-inside: avoid; }
  h3, h4 { break-after: avoid; }
  figcaption { break-before: avoid; }

  /* ---------- component tweaks for paper ---------- */
  .q { box-shadow: none; border-color: #C9D6DD; }
  .q > summary { list-style: none; }
  .q > summary::after { display: none !important; }
  .q .a { display: block !important; }
  .scroll { overflow: visible; }
  table { min-width: 0; font-size: 8.6pt; table-layout: auto; }
  th, td { padding: 2mm 2.5mm; }
  /* Wrap long tokens at sensible points rather than shattering every word. */
  td code, th code { font-size: 8.2pt; word-break: normal; overflow-wrap: anywhere; }
  .route-t th:first-child, .route-t td:first-child { width: 15mm; }
  .route-t th:nth-child(2), .route-t td:nth-child(2) { width: 55mm; }
  .route-t td:nth-child(2) code { font-size: 7.7pt; word-break: break-all; }
  pre { font-size: 8.6pt; }
  figure svg { min-width: 0; max-height: 210mm; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; }
  .where code { font-size: 8.4pt; }
  h1 { font-size: 26pt; }
  section > h3 { font-size: 15pt; }
  .part h2 { font-size: 19pt; }

  a { text-decoration: none; }
</style>
`;

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${head}
${printCss}
</head>
<body>
${cover}
${body}
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT} — ${(html.length / 1024).toFixed(0)} KB, ${toc.length} sections in contents`);
