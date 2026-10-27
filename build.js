// Builds the paste-ready snippets in dist/.
const fs = require('fs');
const path = require('path');

const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const minCss = css => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();

const css = minCss(src('blog-tables.css'));
const js = src('builder.js');

// Release served by jsDelivr from the public GitHub repo. Bump with each tagged release.
const VERSION = 'v1.0.2';
const CDN = `https://cdn.jsdelivr.net/gh/Qontour-Dev/cyera-blog-tables@${VERSION}/dist`;

// Explains the snippet to anyone who finds it in Webflow's custom code.
const NOTE = '<!-- Cyera blog tables: styles for tables made with the Blog Table Builder (/blog-table-builder) and pasted into posts as HTML embeds. Source and how to update: https://github.com/Qontour-Dev/cyera-blog-tables -->';

const out = {
  // Files served by jsDelivr for the builder page.
  'blog-tables.min.css': `${css}\n`,
  'builder.js': js,
  // 1. Blog post template: Page settings > Custom code > Inside <head> tag (inline, so live posts never depend on the CDN)
  'blog-template-head.html': `${NOTE}\n<style>${css}</style>\n`,
  // 2. Hidden builder page: Page settings > Custom code > Before </body> tag (loads the release from jsDelivr)
  'builder-page-body-cdn.html': `<link rel="stylesheet" href="${CDN}/blog-tables.min.css">\n<div id="cy-table-builder"></div>\n<script src="${CDN}/builder.js"></script>\n`,
  // 2b. Same page without the CDN (everything inline), as a fallback.
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
</body></html>`);
console.log('test.html written');
