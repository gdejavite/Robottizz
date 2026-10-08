// Monta a Torre Gabriel em um único arquivo HTML (dist/torre-gabriel.html).
// Uso: node build.mjs
// Ordem: src/js/*.js (exceto 99-start) → src/floors/*.js → src/js/99-start.js,
// tudo dentro de uma única função (escopo fechado, 'use strict').
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const list = (dir) => readdirSync(join(src, dir)).filter((f) => f.endsWith('.js')).sort().map((f) => join(dir, f));

const js = list('js');
const start = js.filter((f) => f.endsWith('99-start.js'));
const order = [...js.filter((f) => !start.includes(f)), ...list('floors'), ...start];

const body = order.map((f) => `/* ===== ${f} ===== */\n` + readFileSync(join(src, f), 'utf8')).join('\n');
const script = `(function(){\n'use strict';\n${body}\n})();`;

// 1) sintaxe: falha o build se algum arquivo quebrar o script
try { new vm.Script(script, { filename: 'torre.js' }); }
catch (e) { console.error('Erro de sintaxe no script montado:', e.message); process.exit(1); }
if (/<\/script/i.test(script)) { console.error('O script contém "</script", o que quebraria o HTML.'); process.exit(1); }

// 2) privacidade: nenhum valor do arquivo de dados privados pode aparecer no HTML final
const privFile = join(root, 'private', 'dados-privados.json');
if (existsSync(privFile)) {
  const priv = JSON.parse(readFileSync(privFile, 'utf8'));
  const leaks = [];
  for (const [fid, d] of Object.entries(priv)) {
    if (fid.startsWith('_leia')) continue;
    const vals = fid === '_notify' ? Object.values(d) : Object.values(d.vars || {});
    for (const v of vals) if (String(v).length >= 4 && script.includes(String(v))) leaks.push(`${fid}: ${v}`);
  }
  if (leaks.length) { console.error('Dados privados encontrados no código:\n  ' + leaks.join('\n  ')); process.exit(1); }
}

const css = readFileSync(join(src, 'css', 'torre.css'), 'utf8');
const html = readFileSync(join(src, 'index.html'), 'utf8').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => script);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'torre-gabriel.html'), html);
console.log(`ok: dist/torre-gabriel.html (${(html.length / 1024).toFixed(0)} KB, ${order.length} arquivos)`);
