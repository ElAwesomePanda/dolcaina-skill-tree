#!/usr/bin/env node
// =============================================================================
// comparar_csv.mjs — Compara dos CSV de nodes i resumeix els canvis.
//
// El fa servir eines/menu.ps1 abans d'importar un CSV nou, perquè es veja què
// canviarà ABANS de substituir el del projecte.
//
// Ús: node eines/comparar_csv.mjs <csv_actual> <csv_nou>
// =============================================================================

import { readFileSync } from 'fs';

// Mateix parser que crear_topics.js. Si allà canvia, ací també.
function parseCsvRow(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

function carregar(ruta) {
  const lines = readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseCsvRow(lines[0]);
  const rows = lines.slice(1)
    .filter(l => l.trim() !== '')
    .map(l => {
      const vals = parseCsvRow(l);
      const row = {};
      headers.forEach((h, i) => row[h] = vals[i] ?? '');
      return row;
    })
    .filter(r => r.id);
  return { headers, rows };
}

// Retalla els valors llargs perquè la taula no es desmadre a la consola.
function curt(v, max = 42) {
  const s = String(v ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

const [rutaVella, rutaNova] = process.argv.slice(2);
if (!rutaVella || !rutaNova) {
  console.error('Ús: node eines/comparar_csv.mjs <csv_actual> <csv_nou>');
  process.exit(2);
}

let vell, nou;
try {
  vell = carregar(rutaVella);
  nou  = carregar(rutaNova);
} catch (e) {
  console.error(`  No he pogut llegir els CSV: ${e.message}`);
  process.exit(1);
}

// Les columnes han de coincidir: si no, l'exportació no és del mateix full.
const colsVelles = vell.headers.join(',');
const colsNoves  = nou.headers.join(',');
if (colsVelles !== colsNoves) {
  console.log('  ATENCIÓ: les columnes no coincideixen!');
  const faltenNoves = vell.headers.filter(h => !nou.headers.includes(h));
  const sobrenNoves = nou.headers.filter(h => !vell.headers.includes(h));
  if (faltenNoves.length) console.log(`    Falten al CSV nou:  ${faltenNoves.join(', ')}`);
  if (sobrenNoves.length) console.log(`    Sobren al CSV nou:  ${sobrenNoves.join(', ')}`);
  console.log('    Comprova que has exportat el full correcte.');
  console.log('');
}

const mapVell = new Map(vell.rows.map(r => [r.id, r]));
const mapNou  = new Map(nou.rows.map(r => [r.id, r]));

const afegits = nou.rows.filter(r => !mapVell.has(r.id));
const llevats = vell.rows.filter(r => !mapNou.has(r.id));

const modificats = [];
for (const r of nou.rows) {
  const v = mapVell.get(r.id);
  if (!v) continue;
  for (const col of nou.headers) {
    if ((r[col] ?? '') !== (v[col] ?? '')) {
      modificats.push({ id: r.id, col, abans: v[col], despres: r[col] });
    }
  }
}

const pubVell = vell.rows.filter(r => r.discourse_topic_id).length;
const pubNou  = nou.rows.filter(r => r.discourse_topic_id).length;

console.log(`    Nodes:      ${vell.rows.length}  →  ${nou.rows.length}`);
console.log(`    Publicats:  ${pubVell}  →  ${pubNou}`);
console.log('');

if (afegits.length) {
  console.log(`    NOUS (${afegits.length}):`);
  afegits.forEach(r => console.log(`      + ${r.id.padEnd(26)} ${curt(r.titol)}`));
  console.log('');
}

if (llevats.length) {
  console.log(`    LLEVATS (${llevats.length}):`);
  llevats.forEach(r => {
    const avis = r.discourse_topic_id ? '  ATENCIÓ: estava publicat!' : '';
    console.log(`      - ${r.id.padEnd(26)} ${curt(r.titol)}${avis}`);
  });
  console.log('');
}

if (modificats.length) {
  // Agrupem per columna: així es veu d'un colp «15 canvis de force_update».
  const perCol = new Map();
  modificats.forEach(m => {
    if (!perCol.has(m.col)) perCol.set(m.col, []);
    perCol.get(m.col).push(m);
  });
  console.log(`    MODIFICATS (${modificats.length} cel·les):`);
  for (const [col, llista] of perCol) {
    console.log(`      ${col}  (${llista.length})`);
    llista.slice(0, 6).forEach(m =>
      console.log(`        ${m.id.padEnd(26)} "${curt(m.abans, 24)}" → "${curt(m.despres, 24)}"`));
    if (llista.length > 6) console.log(`        ... i ${llista.length - 6} més`);
  }
  console.log('');
}

if (!afegits.length && !llevats.length && !modificats.length) {
  console.log('    Cap canvi: els dos CSV són iguals.');
  console.log('');
}
