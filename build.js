// Builds the paste-ready snippets in dist/.
const fs = require('fs');
const path = require('path');

const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const minCss = css => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();

const css = minCss(src('blog-tables.css'));
const js = src('builder.js');

const out = {
  // 1. Blog post template: Page settings > Custom code > Inside <head> tag
  'blog-template-head.html': `<style>${css}</style>\n`,
  // 2. Hidden builder page: Page settings > Custom code > Before </body> tag
  'builder-page-body.html': `<style>${css}</style>\n<div id="cy-table-builder"></div>\n<script>\n${js}</script>\n`,
};

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
for (const [name, body] of Object.entries(out)) {
  fs.writeFileSync(path.join(__dirname, 'dist', name), body);
  console.log(name.padEnd(26), body.length.toLocaleString(), 'characters');
}

// Local test page using Cyera's live stylesheets (fonts and colour variables).
const live = [
  'https://cdn.prod.website-files.com/69443372754a5005a10559a5/css/cyera-staging.shared.b98c91602.min.css',
  'https://cdn.prod.website-files.com/69443372754a5005a10559a5/css/cyera-staging.694a483bb7268983e0f7314e.486a2cb28.opt.min.css',
];
fs.writeFileSync(path.join(__dirname, 'dist', 'test.html'),
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Table builder test</title>
${live.map(h => `<link rel="stylesheet" href="${h}">`).join('\n')}
</head><body>
${out['builder-page-body.html']}
<div style="max-width:760px;margin:40px auto;padding:0 16px"><h2>In a blog post</h2><div class="blog-text-rich-text w-richtext" id="in-post"></div></div>
</body></html>`);
console.log('test.html written');
