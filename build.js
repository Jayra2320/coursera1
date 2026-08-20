/* build.js — bundle the app into single files for distribution.
 *
 *   node build.js
 *
 * The local app needs no build: index.html loads plain scripts over file://.
 * This exists only to produce shareable single-file copies.
 *
 *   dist/fuel.html           a complete standalone document — email it, put it
 *                            on a USB stick, open it anywhere
 *   dist/fuel.artifact.html  the same page as a fragment (no <html>/<head>/
 *                            <body>), which is what a hosted Artifact expects,
 *                            since the host supplies the document skeleton
 */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');

const scriptTags = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g));
if (!scriptTags.length) throw new Error('No script tags found in index.html.');

const bundle = scriptTags
  .map(([, src]) => {
    const code = fs.readFileSync(path.join(root, src), 'utf8');
    /* Nothing in the source may contain a literal </script> — it would end the
       inline block early and silently break the page. */
    if (code.includes('</script>')) {
      throw new Error(`${src} contains a literal </script>, which would close the inline block early.`);
    }
    return `/* ===== ${src} ===== */\n${code}`;
  })
  .join('\n\n');

const styleBlock = `<style>\n${css}\n</style>`;
const scriptBlock = `<script>\n${bundle}\n</script>`;

/* ---- standalone document ---- */

/* Replacement strings are passed as functions throughout: the bundled source
   contains sequences like $' and $& that String.replace would otherwise treat
   as substitution patterns and splice the document into itself. */
let standalone = html.replace(/<link rel="stylesheet" href="css\/styles\.css">/, () => styleBlock);
standalone = standalone.replace(scriptTags[0][0], () => scriptBlock);
scriptTags.slice(1).forEach(([tag]) => { standalone = standalone.replace(tag, () => ''); });
standalone = standalone.replace(/\n{3,}/g, '\n\n');

/* ---- artifact fragment ---- */

const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
const fontLinks = Array.from(html.matchAll(/<link rel="(?:preconnect|stylesheet)"[^>]*fonts\.g[^>]*>/g))
  .map(([tag]) => tag)
  .join('\n');
const bodyInner = standalone
  .slice(standalone.indexOf('<body>') + '<body>'.length, standalone.lastIndexOf('</body>'))
  .trim();

const fragment = [
  `<title>${title}</title>`,
  fontLinks,
  styleBlock,
  bodyInner
].join('\n') + '\n';

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/fuel.html'), standalone);
fs.writeFileSync(path.join(root, 'dist/fuel.artifact.html'), fragment);

const kb = (s) => Math.round(Buffer.byteLength(s) / 1024);
console.log(`dist/fuel.html          ${kb(standalone)} KB`);
console.log(`dist/fuel.artifact.html ${kb(fragment)} KB   (${scriptTags.length} scripts inlined)`);
