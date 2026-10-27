// Headless test of the builder and the table CSS. Run: node test.js [screenshotDir]
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = 'file:///' + path.join(__dirname, 'dist', 'test.html').replace(/\\/g, '/');
const SHOTS = process.argv[2] || path.join(__dirname, 'dist');

let fails = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) fails++; };

const samples = {
  top: { layout: 'top', firstCol: 'narrow', highlightFirst: true, cells: [
    ['Challenge', 'Description'],
    ['Monitoring', 'Containers are dynamic and ephemeral, often spun up and down in response to demand.'],
    ['2. Identification and mitigation', 'Containers often come from public registries, which may contain outdated or vulnerable images.\nRegular scanning is essential.'],
  ] },
  left: { layout: 'left', firstCol: 'narrow', highlightFirst: false, cells: [
    ['Goal misalignment to destruction', 'The agent treats safeguards as obstacles and removes them.', 'Replit agent deleted a live production database.'],
    ['Data exfiltration & leakage', 'Privileged access meets poor judgment.', 'Browser agent leaked confidential M&A details.'],
  ] },
  compare: { layout: 'compare', firstCol: 'wide', highlightFirst: true, cells: [
    ['Value', 'Cyera', 'Others'],
    ['Comparison value', 'yes', 'no'],
    ['Another value', '✅', 'Partial'],
  ] },
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(PAGE, { waitUntil: 'networkidle0' });
  // Test-only blog post area (not part of the builder)
  await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'max-width:760px;margin:40px auto;padding:0 16px'; d.innerHTML = '<div class="blog-text-rich-text w-richtext" id="in-post"></div>'; document.body.appendChild(d); });

  check('builder mounted', await page.$eval('#cy-table-builder', el => !!el.querySelector('.ctb-grid textarea')));

  // Typing updates the output
  await page.evaluate(() => localStorage.clear());
  await page.click('textarea[data-r="0"][data-c="0"]');
  await page.keyboard.type('Hello');
  check('typing updates output', (await page.$eval('[data-out]', t => t.value)).includes('<th scope="col">Hello</th>'));

  for (const [name, s] of Object.entries(samples)) {
    const html = await page.evaluate(st => { window.__cyTableBuilder.setState(JSON.parse(JSON.stringify(st))); return document.querySelector('[data-out]').value; }, s);
    const back = await page.evaluate(h => window.__cyTableBuilder.parseHtml(h), html);
    const norm = c => c.map(r => r.map(v => (/^(✅)$/.test(v) ? 'yes' : v)));
    check(name + ': round trip', JSON.stringify(norm(s.cells)) === JSON.stringify(back.cells) && back.layout === s.layout && back.firstCol === s.firstCol, back.layout);
    if (name === 'top') {
      check('top: thead + col headers', /<thead><tr><th scope="col">Challenge<\/th>/.test(html));
      check('top: line breaks kept', html.includes('images.<br>Regular'));
      check('top: classes', html.startsWith('<div class="cy-table cy-table--header-top cy-table--first-col cy-table--first-narrow">'), html.slice(0, 110));
    }
    if (name === 'left') {
      check('left: no thead, row headers', !html.includes('<thead>') && html.includes('<th scope="row">Goal misalignment'));
      check('left: ampersand escaped', html.includes('leakage') && html.includes('M&amp;A'));
      check('left: 3 cols scroll class', html.includes('cy-table--min-md'));
    }
    if (name === 'compare') {
      check('compare: yes icon + text', html.includes('cy-table__icon--yes') && html.includes('<span class="cy-table__sr">Yes</span>'));
      check('compare: no icon', html.includes('cy-table__icon--no'));
      check('compare: other text kept', html.includes('>Partial</td>'));
      check('compare: header not iconified', html.includes('<th scope="col">Cyera</th>'));
    }
    // Render inside a real blog rich-text block and check styles
    await page.evaluate(h => { document.getElementById('in-post').innerHTML = '<p>Text before.</p><div class="w-embed">' + h + '</div><p>Text after.</p>'; }, html);
    const st = await page.evaluate(() => {
      const t = document.querySelector('#in-post .cy-table');
      const head = t.querySelector('thead th') || t.querySelector('tbody th');
      const td = t.querySelector('tbody td:not(:first-child)') || t.querySelector('tbody td');
      const first = t.querySelector('tbody tr > :first-child');
      const cs = el => getComputedStyle(el);
      return { headBg: cs(head).backgroundColor, headColor: cs(head).color, cellBg: cs(td).backgroundColor, firstBg: cs(first).backgroundColor, font: cs(td).fontFamily, size: cs(td).fontSize, radius: cs(t).borderTopLeftRadius, align: cs(td).textAlign };
    });
    check(name + ': purple header', st.headBg === 'rgb(109, 45, 147)' && st.headColor === 'rgb(251, 251, 251)', st.headBg);
    check(name + ': cell colour', st.cellBg === 'rgb(246, 245, 241)', st.cellBg);
    if (name !== 'left') check(name + ': beige first column', st.firstBg === 'rgb(238, 237, 231)', st.firstBg);
    check(name + ': Haffer font 14px', /Haffer/.test(st.font) && st.size === '14px', st.font + ' ' + st.size);
    check(name + ': 10px corners', st.radius === '10px');
    if (name === 'compare') { check('compare: centred cells', st.align === 'center'); check('compare: first column left', await page.evaluate(() => getComputedStyle(document.querySelector('#in-post tbody tr > :first-child')).textAlign) === 'left'); }
    await page.setViewport({ width: 1280, height: 900 });
    const el = await page.$('#in-post');
    await el.screenshot({ path: path.join(SHOTS, `table-${name}-desktop.png`) });
    await page.setViewport({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(name + ': no page overflow on mobile', !overflow);
    await el.screenshot({ path: path.join(SHOTS, `table-${name}-mobile.png`) });
    await page.setViewport({ width: 1280, height: 900 });
  }

  // Script injection is escaped
  const xss = await page.evaluate(() => { window.__cyTableBuilder.setState({ layout: 'top', firstCol: 'auto', highlightFirst: false, cells: [['<script>alert(1)</script>', '<img src=x onerror=alert(1)>']] }); return document.querySelector('[data-out]').value; });
  check('html is escaped', !xss.includes('<script>') && !xss.includes('<img') && xss.includes('&lt;script&gt;'));

  // Paste from a spreadsheet (tab-separated) into the first cell
  await page.evaluate(() => window.__cyTableBuilder.setState({ layout: 'top', firstCol: 'narrow', highlightFirst: true, cells: [['', ''], ['', '']] }));
  await page.evaluate(() => {
    const ta = document.querySelector('textarea[data-r="0"][data-c="0"]');
    const dt = new DataTransfer();
    dt.setData('text/plain', 'A\tB\tC\n1\t2\t3\n4\t5\t6\n');
    ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  const pasted = await page.evaluate(() => window.__cyTableBuilder.getState().cells);
  check('paste from spreadsheet grows the grid', JSON.stringify(pasted) === JSON.stringify([['A', 'B', 'C'], ['1', '2', '3'], ['4', '5', '6']]), JSON.stringify(pasted));

  // Load an existing table through the UI
  await page.evaluate(() => { const b = document.querySelector('[data-out]'); b.value = '<div class="cy-table cy-table--header-left cy-table--first-narrow"><table><tbody><tr><th scope="row">Row</th><td>Value</td></tr></tbody></table></div>'; b.dispatchEvent(new Event('input', { bubbles: true })); });
  const loaded = await page.evaluate(() => window.__cyTableBuilder.getState());
  check('paste code into code box loads table', loaded.layout === 'left' && loaded.cells[0][1] === 'Value' && (await page.$eval('textarea[data-r="0"][data-c="1"]', x => x.value)) === 'Value');
  await page.evaluate(() => { const b = document.querySelector('[data-out]'); b.value = 'hello'; b.dispatchEvent(new Event('input', { bubbles: true })); });
  check('bad code shows error, keeps table', (await page.$eval('[data-msg]', m => m.classList.contains('is-error'))) && (await page.evaluate(() => window.__cyTableBuilder.getState().cells[0][1])) === 'Value');

  // Add row / add column buttons next to the grid
  await page.evaluate(() => window.__cyTableBuilder.setState({ layout: 'top', firstCol: 'narrow', highlightFirst: true, cells: [['a', 'b'], ['c', 'd']] }));
  await page.click('.ctb-add--row');
  await page.click('.ctb-add--col');
  const size = await page.evaluate(() => { const c = window.__cyTableBuilder.getState().cells; return c.length + 'x' + c[0].length; });
  check('add row and add column buttons', size === '3x3', size);

  // Delete buttons: trash icon with a clear label, tint before deleting, and undo
  await page.evaluate(() => window.__cyTableBuilder.setState({ layout: 'top', firstCol: 'narrow', highlightFirst: true, cells: [['a', 'b'], ['c', 'd'], ['e', 'f']] }));
  const delRow = await page.$('[data-delrow="1"]');
  check('delete button is a labelled trash icon', (await delRow.evaluate(b => b.getAttribute('aria-label') === 'Delete row 2' && !!b.querySelector('svg'))));
  await delRow.hover();
  check('hover tints the row to delete', await page.evaluate(() => document.querySelectorAll('td.is-doomed textarea[data-r="1"]').length === 2 && document.querySelectorAll('td.is-doomed').length === 2));
  await delRow.click();
  const afterDel = await page.evaluate(() => window.__cyTableBuilder.getState().cells.map(r => r.join('')).join(','));
  check('delete row removes it and shows undo', afterDel === 'ab,ef' && await page.$eval('[data-notice]', n => !n.hidden && n.textContent.includes('Row 2 deleted')), afterDel);
  await page.click('[data-act="undo"]');
  const afterUndo = await page.evaluate(() => window.__cyTableBuilder.getState().cells.map(r => r.join('')).join(','));
  check('undo restores the row', afterUndo === 'ab,cd,ef' && await page.$eval('[data-notice]', n => n.hidden), afterUndo);
  await page.click('[data-delcolumn="0"]');
  const afterCol = await page.evaluate(() => window.__cyTableBuilder.getState().cells.map(r => r.join('')).join(','));
  check('delete column works', afterCol === 'b,d,f' && await page.$eval('[data-notice-text]', n => n.textContent === 'Column 1 deleted.'), afterCol);

  // Builder screenshot
  await page.evaluate(st => window.__cyTableBuilder.setState(st), samples.top);
  await page.screenshot({ path: path.join(SHOTS, 'builder.png'), fullPage: true });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
