# Cyera blog tables

Reusable HTML tables for Cyera blog posts (Webflow), styled from the Blog Figma file, plus a small builder so editors never edit table HTML by hand.

- `src/blog-tables.css`: table styles. Uses the site's Webflow colour variables, with fallbacks.
- `src/builder.js`: the table builder (layout, rows and columns, paste from a spreadsheet, live preview, copy code, load an existing table to edit).
- `node build.js`: writes the paste-ready snippets to `dist/`.
- `node test.js`: headless Chrome test (needs `npm install` and Chrome).

## Webflow setup
1. Blog post template: Page settings > Custom code > Inside `<head>` tag: paste `dist/blog-template-head.html`.
2. Hidden builder page (password protected, excluded from search): Page settings > Custom code > Before `</body>` tag: paste `dist/builder-page-body.html`.
3. Editors: build the table, click Copy code, then in the blog post add an HTML embed and paste.
