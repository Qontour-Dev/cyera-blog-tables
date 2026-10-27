/* Cyera blog table builder.
   Mounts into <div id="cy-table-builder"></div>. Needs blog-tables.css on the same page for the preview. */
(function () {
  'use strict';

  var root = document.getElementById('cy-table-builder');
  if (!root) return;

  var STORE_KEY = 'cy-table-builder-draft';
  var YES = /^(yes|y|true|✓|✔|✅|☑)$/i;
  var NO = /^(no|n|false|✗|✘|❌|×|x)$/i;

  var state = load() || newState();

  function newState() {
    return {
      layout: 'top',      // top | left | compare
      firstCol: 'narrow', // narrow | wide | auto
      highlightFirst: true,
      cells: makeGrid(4, 3)
    };
  }

  function makeGrid(rows, cols) {
    var g = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push('');
      g.push(row);
    }
    return g;
  }

  function rows() { return state.cells.length; }
  function cols() { return state.cells[0].length; }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.cells && s.cells.length && s.cells[0].length) return s;
    } catch (e) {}
    return null;
  }

  // ---------- HTML output ----------

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function cellHtml(text, isCompareValue) {
    var t = text.trim();
    if (isCompareValue && YES.test(t)) {
      return '<span class="cy-table__icon cy-table__icon--yes" aria-hidden="true"></span><span class="cy-table__sr">Yes</span>';
    }
    if (isCompareValue && NO.test(t)) {
      return '<span class="cy-table__icon cy-table__icon--no" aria-hidden="true"></span><span class="cy-table__sr">No</span>';
    }
    return esc(t).replace(/\r?\n/g, '<br>');
  }

  function wrapperClasses() {
    var cls = ['cy-table'];
    var layout = state.layout;
    if (layout === 'left') cls.push('cy-table--header-left');
    else cls.push('cy-table--header-top');
    if (layout === 'compare') cls.push('cy-table--compare');
    if (layout !== 'left' && state.highlightFirst) cls.push('cy-table--first-col');
    if (state.firstCol !== 'auto') cls.push('cy-table--first-' + state.firstCol);
    if (cols() >= 4) cls.push('cy-table--min-lg');
    else if (cols() === 3) cls.push('cy-table--min-md');
    return cls.join(' ');
  }

  function buildHtml() {
    var out = [];
    var g = state.cells;
    var layout = state.layout;
    out.push('<div class="' + wrapperClasses() + '">');
    out.push('<table>');
    var start = 0;
    if (layout !== 'left') {
      out.push('<thead><tr>');
      g[0].forEach(function (t) { out.push('<th scope="col">' + cellHtml(t, false) + '</th>'); });
      out.push('</tr></thead>');
      start = 1;
    }
    out.push('<tbody>');
    for (var r = start; r < g.length; r++) {
      out.push('<tr>');
      g[r].forEach(function (t, c) {
        if (c === 0 && layout === 'left') out.push('<th scope="row">' + cellHtml(t, false) + '</th>');
        else out.push('<td>' + cellHtml(t, layout === 'compare' && c > 0) + '</td>');
      });
      out.push('</tr>');
    }
    out.push('</tbody></table></div>');
    return out.join('');
  }

  // ---------- Load existing HTML back into the grid ----------

  function cellText(el) {
    if (el.querySelector('.cy-table__icon--yes')) return 'yes';
    if (el.querySelector('.cy-table__icon--no')) return 'no';
    var clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach(function (br) { br.replaceWith('\n'); });
    return clone.textContent.trim();
  }

  function parseHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var wrap = doc.querySelector('.cy-table');
    var table = doc.querySelector('table');
    if (!table) throw new Error('No table found in the pasted code.');
    var cls = wrap ? wrap.className : '';
    var grid = [];
    table.querySelectorAll('tr').forEach(function (tr) {
      var row = [];
      tr.querySelectorAll('th, td').forEach(function (cell) { row.push(cellText(cell)); });
      if (row.length) grid.push(row);
    });
    if (!grid.length) throw new Error('The table has no rows.');
    var width = Math.max.apply(null, grid.map(function (r) { return r.length; }));
    grid.forEach(function (r) { while (r.length < width) r.push(''); });
    var hasHead = !!table.querySelector('thead');
    return {
      layout: /cy-table--compare/.test(cls) ? 'compare' : (!hasHead || /cy-table--header-left/.test(cls)) ? 'left' : 'top',
      firstCol: /cy-table--first-wide/.test(cls) ? 'wide' : /cy-table--first-narrow/.test(cls) ? 'narrow' : 'auto',
      highlightFirst: /cy-table--first-col/.test(cls),
      cells: grid
    };
  }

  // ---------- UI ----------

  var css = [
    '#cy-table-builder{--b-line:#d4d2c8;--b-ink:#160923;--b-purple:#6d2d93;font-size:14px;color:var(--b-ink)}',
    '#cy-table-builder h2{font-size:22px;margin:32px 0 12px}',
    '#cy-table-builder p.ctb-help{margin:0 0 12px;color:#5b5466;font-size:13px;line-height:1.5}',
    '.ctb-bar{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;margin-bottom:16px}',
    '.ctb-field{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:500}',
    '.ctb-field select{padding:6px 8px;border:1px solid var(--b-line);border-radius:6px;font:inherit;font-size:14px;background:#fff}',
    '.ctb-check{display:flex;gap:6px;align-items:center;font-size:13px;padding-bottom:6px}',
    '.ctb-btn{padding:7px 12px;border:1px solid var(--b-line);border-radius:6px;background:#fff;font:inherit;font-size:13px;cursor:pointer;color:var(--b-ink)}',
    '.ctb-btn:hover{border-color:var(--b-purple)}',
    '.ctb-btn--main{background:var(--b-purple);border-color:var(--b-purple);color:#fff}',
    '.ctb-btn--danger{color:#b42318}',
    '.ctb-editor{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:6px}',
    '.ctb-grid-wrap{overflow-x:auto;border:1px solid var(--b-line);border-radius:8px;background:#fff}',
    '.ctb-add{border:1px dashed var(--b-line);border-radius:8px;background:#faf9f6;color:var(--b-purple);font:inherit;font-size:13px;font-weight:500;cursor:pointer}',
    '.ctb-add:hover{border-color:var(--b-purple);background:#f6e8ff}',
    '.ctb-add--row{grid-column:1;padding:8px}',
    '.ctb-add--col{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:18px}',
    '.ctb-add--col span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:13px}',
    '.ctb-grid{border-collapse:collapse;width:100%}',
    '.ctb-grid td{border:1px solid var(--b-line);padding:0;vertical-align:top;min-width:140px}',
    '.ctb-grid td.ctb-head textarea{background:#f6e8ff;font-weight:500}',
    '.ctb-grid textarea{display:block;width:100%;min-height:56px;border:0;padding:8px;font:inherit;font-size:13px;resize:vertical;box-sizing:border-box;color:var(--b-ink)}',
    '.ctb-grid textarea:focus{outline:2px solid var(--b-purple);outline-offset:-2px}',
    '.ctb-grid .ctb-ctl{min-width:0;width:34px;text-align:center;vertical-align:middle;background:#faf9f6;border-color:transparent}',
    '.ctb-x{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:6px;background:none;color:#8a8394;cursor:pointer;padding:0}',
    '.ctb-x svg{width:16px;height:16px;pointer-events:none}',
    '.ctb-x:hover,.ctb-x:focus-visible{color:#b42318;background:#fdecea;outline:none}',
    '.ctb-grid td.is-doomed textarea{background:#fdecea}',
    '.ctb-notice{display:flex;gap:10px;align-items:center;margin-top:8px;font-size:13px;color:var(--b-ink)}',
    '.ctb-notice[hidden]{display:none}',
    '.ctb-undo{border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--b-purple);text-decoration:underline;cursor:pointer}',
    '.ctb-out{width:100%;min-height:120px;font-family:ui-monospace,Consolas,monospace;font-size:12px;padding:10px;border:1px solid var(--b-line);border-radius:6px;box-sizing:border-box}',
    '.ctb-row{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}',
    '.ctb-msg{font-size:13px;color:#2b7a3d}',
    '.ctb-msg.is-error{color:#b42318}',
    '.ctb-preview{padding:8px 0}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  root.innerHTML =
    '<div class="ctb-bar">' +
      '<label class="ctb-field">Layout<select data-k="layout">' +
        '<option value="top">Header row on top</option>' +
        '<option value="left">Header column on the left</option>' +
        '<option value="compare">Comparison (yes / no icons)</option>' +
      '</select></label>' +
      '<label class="ctb-field">First column width<select data-k="firstCol">' +
        '<option value="narrow">Narrow</option>' +
        '<option value="wide">Wide</option>' +
        '<option value="auto">Automatic</option>' +
      '</select></label>' +
      '<label class="ctb-check" data-hl><input type="checkbox" data-k="highlightFirst"> Beige first column</label>' +
      '<button type="button" class="ctb-btn ctb-btn--danger" data-act="clear">Reset table</button>' +
    '</div>' +
    '<p class="ctb-help" data-hint></p>' +
    '<div class="ctb-editor">' +
      '<div class="ctb-grid-wrap"><table class="ctb-grid"></table></div>' +
      '<button type="button" class="ctb-add ctb-add--col" data-act="addCol" title="Add a column on the right">+<span>Add column</span></button>' +
      '<button type="button" class="ctb-add ctb-add--row" data-act="addRow" title="Add a row at the bottom">+ Add row</button>' +
    '</div>' +
    '<div class="ctb-notice" data-notice role="status" hidden><span data-notice-text></span><button type="button" class="ctb-undo" data-act="undo">Undo</button></div>' +
    '<h2>Preview</h2>' +
    '<div class="ctb-preview"></div>' +
    '<h2>Table code</h2>' +
    '<p class="ctb-help">Copy this code into an HTML embed in the blog post. To edit a table that is already in a post, paste its code here and it opens in the editor above.</p>' +
    '<textarea class="ctb-out" data-out spellcheck="false"></textarea>' +
    '<div class="ctb-row"><button type="button" class="ctb-btn ctb-btn--main" data-act="copy">Copy code</button><span class="ctb-msg" data-msg></span><span class="ctb-help" data-count></span></div>';

  var $ = function (sel) { return root.querySelector(sel); };
  var gridEl = $('.ctb-grid');

  function hint() {
    var h = {
      top: 'The first row is the purple header. Tip: copy cells from Excel, Google Sheets or a Google Doc table and paste them into any cell.',
      left: 'The first column is the purple header. There is no header row. Tip: paste cells from a spreadsheet into any cell.',
      compare: 'The first row is the header. In the other columns, type yes or no to show a tick or a cross. Anything else shows as text.'
    };
    return h[state.layout];
  }

  function isHeadCell(r, c) {
    return state.layout === 'left' ? c === 0 : r === 0;
  }

  var TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';

  function delButton(kind, i) {
    var label = 'Delete ' + kind + ' ' + (i + 1);
    return '<button type="button" class="ctb-x" title="' + label + '" aria-label="' + label + '" data-del' + kind + '="' + i + '">' + TRASH + '</button>';
  }

  function renderGrid() {
    var html = '<tr><td class="ctb-ctl"></td>';
    for (var c = 0; c < cols(); c++) {
      html += '<td class="ctb-ctl">' + (cols() > 1 ? delButton('column', c) : '') + '</td>';
    }
    html += '</tr>';
    state.cells.forEach(function (row, r) {
      html += '<tr><td class="ctb-ctl">' + (rows() > 1 ? delButton('row', r) : '') + '</td>';
      row.forEach(function (t, c) {
        html += '<td class="' + (isHeadCell(r, c) ? 'ctb-head' : '') + '"><textarea data-r="' + r + '" data-c="' + c + '" aria-label="Row ' + (r + 1) + ', column ' + (c + 1) + '">' + esc(t) + '</textarea></td>';
      });
      html += '</tr>';
    });
    gridEl.innerHTML = html;
    gridEl.querySelectorAll('textarea').forEach(grow);
  }

  function grow(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 2 + 'px';
  }

  // keepCode: leave the code box as the user typed or pasted it.
  function renderOutput(keepCode) {
    var html = buildHtml();
    $('.ctb-preview').innerHTML = html;
    if (!keepCode) $('[data-out]').value = html;
    $('[data-count]').textContent = html.length.toLocaleString() + ' characters';
    save();
  }

  function renderControls() {
    root.querySelector('[data-k="layout"]').value = state.layout;
    root.querySelector('[data-k="firstCol"]').value = state.firstCol;
    root.querySelector('[data-k="highlightFirst"]').checked = !!state.highlightFirst;
    root.querySelector('[data-hl]').style.display = state.layout === 'left' ? 'none' : '';
    $('[data-hint]').textContent = hint();
  }

  function renderAll() {
    renderControls();
    renderGrid();
    renderOutput();
  }

  // Paste a block of cells (tab-separated) from a spreadsheet or doc table.
  function parseTsv(text) {
    var lines = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
    return lines.map(function (l) {
      return l.split('\t').map(function (v) {
        v = v.trim();
        if (/^".*"$/s.test(v)) v = v.slice(1, -1).replace(/""/g, '"');
        return v;
      });
    });
  }

  gridEl.addEventListener('paste', function (e) {
    var ta = e.target;
    if (ta.tagName !== 'TEXTAREA') return;
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (text.indexOf('\t') === -1) return; // normal paste into one cell
    e.preventDefault();
    var block = parseTsv(text);
    var r0 = +ta.dataset.r, c0 = +ta.dataset.c;
    var needRows = r0 + block.length, needCols = c0 + Math.max.apply(null, block.map(function (b) { return b.length; }));
    while (rows() < needRows) state.cells.push(new Array(cols()).fill(''));
    while (cols() < needCols) state.cells.forEach(function (row) { row.push(''); });
    block.forEach(function (line, i) {
      line.forEach(function (v, j) { state.cells[r0 + i][c0 + j] = v; });
    });
    renderGrid();
    renderOutput();
  });

  gridEl.addEventListener('input', function (e) {
    var ta = e.target;
    if (ta.tagName !== 'TEXTAREA') return;
    state.cells[+ta.dataset.r][+ta.dataset.c] = ta.value;
    grow(ta);
    renderOutput();
  });

  function message(text, isError) {
    var m = $('[data-msg]');
    m.className = 'ctb-msg' + (isError ? ' is-error' : '');
    m.textContent = text;
    clearTimeout(message.t);
    if (text && !isError) message.t = setTimeout(function () { m.textContent = ''; }, 2500);
  }

  // Pasting or typing table code in the code box loads it into the editor.
  var codeBox = $('[data-out]');
  codeBox.addEventListener('input', function () {
    var code = codeBox.value.trim();
    if (!code) { message(''); return; }
    try {
      state = parseHtml(code);
    } catch (err) {
      message('This is not a table from this builder. Paste the full table code.', true);
      return;
    }
    renderControls();
    renderGrid();
    renderOutput(true);
    message('Table loaded. Edit it above.');
  });
  codeBox.addEventListener('blur', function () {
    if ($('[data-msg]').classList.contains('is-error')) return;
    renderOutput();
  });

  // Tint the cells a delete button would remove, so users see it before they click.
  function markDoomed(b, on) {
    if (!b) return;
    var sel = b.dataset.delrow !== undefined ? 'textarea[data-r="' + b.dataset.delrow + '"]' : 'textarea[data-c="' + b.dataset.delcolumn + '"]';
    gridEl.querySelectorAll(sel).forEach(function (ta) { ta.parentNode.classList.toggle('is-doomed', on); });
  }
  ['mouseover', 'focusin'].forEach(function (ev) {
    gridEl.addEventListener(ev, function (e) { markDoomed(e.target.closest('.ctb-x'), true); });
  });
  ['mouseout', 'focusout'].forEach(function (ev) {
    gridEl.addEventListener(ev, function (e) { markDoomed(e.target.closest('.ctb-x'), false); });
  });

  var undoState = null;
  function notice(text) {
    var n = $('[data-notice]');
    $('[data-notice-text]').textContent = text;
    n.hidden = !text;
    clearTimeout(notice.t);
    if (text) notice.t = setTimeout(function () { n.hidden = true; undoState = null; }, 10000);
  }

  gridEl.addEventListener('click', function (e) {
    var b = e.target.closest('.ctb-x');
    if (!b) return;
    undoState = JSON.parse(JSON.stringify(state));
    if (b.dataset.delrow !== undefined) {
      state.cells.splice(+b.dataset.delrow, 1);
      notice('Row ' + (+b.dataset.delrow + 1) + ' deleted.');
    } else {
      var c = +b.dataset.delcolumn;
      state.cells.forEach(function (row) { row.splice(c, 1); });
      notice('Column ' + (c + 1) + ' deleted.');
    }
    renderGrid();
    renderOutput();
  });

  root.addEventListener('change', function (e) {
    var k = e.target.dataset.k;
    if (!k) return;
    state[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'layout') {
      if (state.layout === 'compare' && state.firstCol === 'narrow') state.firstCol = 'wide';
      if (state.layout !== 'compare' && state.firstCol === 'wide') state.firstCol = 'narrow';
    }
    renderAll();
  });

  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    var act = btn && btn.dataset.act;
    if (!act) return;
    if (act === 'addRow') state.cells.push(new Array(cols()).fill(''));
    if (act === 'addCol') state.cells.forEach(function (row) { row.push(''); });
    if (act === 'undo') {
      if (!undoState) return;
      state = undoState;
      undoState = null;
      notice('');
    }
    if (act === 'clear') {
      if (!confirm('Reset the table? This clears all cells and settings.')) return;
      state = newState();
    }
    if (act === 'copy') {
      var out = $('[data-out]');
      var done = function () { message('Copied.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(out.value).then(done, function () { out.select(); document.execCommand('copy'); done(); });
      else { out.select(); document.execCommand('copy'); done(); }
      return;
    }
    renderAll();
  });

  // Exposed for tests only.
  window.__cyTableBuilder = { buildHtml: buildHtml, parseHtml: parseHtml, getState: function () { return state; }, setState: function (s) { state = s; renderAll(); } };

  renderAll();
})();
