# Cyera blog tables

Reusable HTML tables for Cyera blog posts (Webflow), styled from the Blog Figma file, plus a small builder so editors never edit table HTML by hand.

- `src/blog-tables.css`: table styles. Uses the site's Webflow colour variables, with fallbacks.
- `src/builder.js`: the table builder (layout, rows and columns, paste from a spreadsheet, live preview, copy code, load an existing table to edit).
- `node build.js`: writes the paste-ready snippets to `dist/`.
- `node test.js`: headless Chrome test (needs `npm install` and Chrome).

## Webflow setup
1. Blog post template: Page settings > Custom code > Inside `<head>` tag: paste `dist/blog-template-head.html` (inline, so live posts don't depend on a CDN).
2. Hidden builder page (password protected, excluded from search): Page settings > Custom code > Before `</body>` tag: paste `dist/builder-page-body-cdn.html`. It loads `dist/blog-tables.min.css` and `dist/builder.js` from jsDelivr at the pinned release tag. `dist/builder-page-body.html` is the same page with everything inline, as a fallback.
3. Editors: build the table, click Copy code, then in the blog post add an HTML embed and paste.

## Releasing a change
1. Edit `src/`, run `node build.js` and `node test.js` (all checks must pass).
2. Bump `VERSION` in `build.js`, rebuild, commit, tag the same version and push the tag.
3. Update the version in the builder page's stylesheet and script URLs in Webflow. If the table CSS changed, paste the new `dist/blog-template-head.html` in the Blog post template too.
