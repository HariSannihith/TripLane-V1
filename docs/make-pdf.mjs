// Renders print.html to PDF with headless Chrome over the DevTools protocol.
// CDP (rather than --print-to-pdf) is what gives us a running footer with real
// page numbers. No npm dependencies: Node 24 ships a global WebSocket.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SCRATCH = 'C:/Users/haris/AppData/Local/Temp/claude/C--Users-haris-OneDrive-Desktop-TripLane/97c1abad-d354-4a3d-a4cc-868ba894c636/scratchpad';
const INPUT = path.join(SCRATCH, 'print.html');
const OUTPUT = 'C:/Users/haris/OneDrive/Desktop/TripLane/docs/TripLane_Interview_Guide.pdf';
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(SCRATCH, 'chrome-profile')}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

async function debuggerUrl() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const data = await res.json();
      if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting up.
    }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debugging endpoint');
}

const ws = new WebSocket(await debuggerUrl());
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const events = new Map();

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method && events.has(msg.method)) {
    events.get(msg.method)();
    events.delete(msg.method);
  }
});

const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const once = (method) => new Promise((resolve) => events.set(method, resolve));

// Attach to a fresh tab.
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

await send('Page.enable', {}, sessionId);
const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url: `file:///${INPUT}` }, sessionId);
await loaded;

// Wait for the Google Fonts faces, otherwise the PDF bakes in fallback metrics.
await send(
  'Runtime.evaluate',
  { expression: 'document.fonts.ready.then(() => document.fonts.status)', awaitPromise: true },
  sessionId
);
await sleep(1200);

const footer = `
<div style="width:100%;font:400 7.5pt 'IBM Plex Sans',sans-serif;color:#7A8D99;
            padding:0 17mm;display:flex;justify-content:space-between;">
  <span>TripLane — Interview Preparation Guide</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;

const { data } = await send(
  'Page.printToPDF',
  {
    printBackground: true,
    paperWidth: 8.27,   // A4
    paperHeight: 11.69,
    marginTop: 0.59,
    marginBottom: 0.67,
    marginLeft: 0,
    marginRight: 0,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footer,
    preferCSSPageSize: false,
  },
  sessionId
);

fs.writeFileSync(OUTPUT, Buffer.from(data, 'base64'));
const kb = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
console.log(`PDF written: ${OUTPUT} (${kb} KB)`);

ws.close();
chrome.kill();
