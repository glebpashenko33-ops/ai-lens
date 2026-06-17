// Automated smoke test for AI Lens — runs the real app in headless Chromium
// with a fake camera feed, drives it through the core flow, and fails loudly
// on any JS error or broken pipeline step. Doesn't replace real-device
// testing (perf, real codecs, Safari quirks) but catches regressions before
// a phone test is even needed.
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let resolved = false;
    proc.stdout.on('data', d => {
      if (!resolved && d.toString().includes('running on port')) { resolved = true; resolve(proc); }
    });
    proc.stderr.on('data', d => process.stderr.write('[server] ' + d));
    proc.on('exit', code => { if (!resolved) reject(new Error('server exited early, code ' + code)); });
    setTimeout(() => { if (!resolved) reject(new Error('server did not start within 5s')); }, 5000);
  });
}

async function main() {
  const failures = [];
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream', // synthetic test-pattern camera + mic, no real hardware needed
    ],
  });

  try {
    const page = await browser.newPage();
    page.on('pageerror', err => failures.push('Uncaught page error: ' + err.message));
    page.on('console', msg => { if (msg.type() === 'error') failures.push('Console error: ' + msg.text()); });

    await page.goto(URL, { waitUntil: 'networkidle0' });

    // ── Step 1: language picker → hub ──────────────────────────────────────
    await page.waitForSelector('.lang-card', { timeout: 5000 });
    await page.click('.lang-card');
    await page.waitForSelector('#screen-hub:not(.hidden)', { timeout: 5000 });
    check(failures, true, 'Reached hub after language selection');

    // ── Step 2: open camera, wait for the stream + render loop to start ───
    await page.evaluate(() => openCameraScreen());
    await page.waitForFunction(() => typeof S !== 'undefined' && S.stream && S.renderRunning, { timeout: 8000 })
      .catch(() => failures.push('Camera stream / render loop never started'));

    // give the render loop a few frames to actually paint
    await new Promise(r => setTimeout(r, 800));
    const canvasHasPixels = await page.evaluate(() => {
      const c = document.getElementById('video-canvas');
      if (!c.width || !c.height) return false;
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) return true;
      return false;
    });
    check(failures, canvasHasPixels, 'video-canvas is actually drawing non-blank frames');

    // ── Step 3: apply a scenario, confirm grading params actually changed ─
    const before = await page.evaluate(() => JSON.stringify(S.tgt));
    await page.evaluate(() => applyScenario('scGolden'));
    const after = await page.evaluate(() => JSON.stringify(S.tgt));
    check(failures, before !== after, 'applyScenario() changes the grading target (S.tgt)');

    // ── Step 4: record for ~1.5s, confirm a real blob comes out the other end ─
    await page.evaluate(() => startRecord());
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => stopRecord());
    await new Promise(r => setTimeout(r, 500));
    const blobInfo = await page.evaluate(() => S.lastBlob ? { size: S.lastBlob.size, type: S.lastBlob.type } : null);
    check(failures, !!blobInfo, 'Recording produced a blob (S.lastBlob set)');
    check(failures, blobInfo && blobInfo.size > 0, 'Recorded blob has non-zero size: ' + (blobInfo && blobInfo.size));

    // ── Step 5: leave camera cleanly, no dangling errors ───────────────────
    await page.evaluate(() => leaveCamera());
    await new Promise(r => setTimeout(r, 200));
  } finally {
    await browser.close();
    server.kill();
  }

  console.log('\n' + '─'.repeat(60));
  if (failures.length) {
    console.log(`FAIL — ${failures.length} issue(s):`);
    failures.forEach(f => console.log('  ✗ ' + f));
    process.exit(1);
  } else {
    console.log('PASS — all smoke checks green.');
  }
}

function check(failures, cond, label) {
  if (cond) console.log('  ✓ ' + label);
  else failures.push(label + ' — FAILED');
}

main().catch(e => { console.error('Smoke test crashed:', e); process.exit(1); });
