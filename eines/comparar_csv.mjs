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

// Un node és actiu si `actiu` no diu FALSE (buit o columna absent = actiu).
const esActiu = r => r.actiu !== 'FALSE';

const actiusVell = vell.rows.filter(esActiu);
const actiusNou  = nou.rows.filter(esActiu);
const pubVell    = vell.rows.filter(r => r.discourse_topic_id).length;
const pubNou     = nou.rows.filter(r => r.discourse_topic_id).length;

// Les tres xifres que canvien per motius diferents. Sense la d'«a l'arbre»,
// activar o amagar branques no es veia enlloc del resum i semblava que la
// importació no feia res.
const n = (a, b) => `${String(a).padStart(3)}  →  ${String(b).toString().padEnd(3)}`;

console.log(`    Nodes al CSV:  ${n(vell.rows.length, nou.rows.length)}`);
console.log(`    A l'arbre:     ${n(actiusVell.length, actiusNou.length)}   (actiu ≠ FALSE)`);
console.log(`    Amb tema:      ${n(pubVell, pubNou)}   (publicats al fòrum)`);

// Els actius sense tema es dibuixen «en preparació»: convé saber quants seran.
const prepVell = actiusVell.filter(r => !r.discourse_topic_id).length;
const prepNou  = actiusNou.filter(r => !r.discourse_topic_id).length;
if (prepVell || prepNou) {
  console.log(`    En preparació: ${n(prepVell, prepNou)}   (a l'arbre, però sense tema)`);
}
console.log('');

// ─── PERILL: pèrdua de discourse_topic_id ────────────────────────────────────
//
// És la condició exacta que provoca temes duplicats al fòrum: si el CSV nou
// buida un id que el vell tenia, l'script creurà que el node no s'ha publicat
// mai i tornarà a crear el tema. Va passar el 2026-09-24 amb una exportació
// de fa 13 dies, i només ens va salvar que Discourse rebutja títols repetits.
//
// Es reporta en un bloc propi i el codi d'eixida passa a 3 perquè el menú el
// puga tractar diferent d'un canvi qualsevol.
const idsPerduts = modificats.filter(m =>
  m.col === 'discourse_topic_id' && m.abans && !m.despres);

// Els nodes publicats que desapareixen del CSV tenen el mateix efecte.
const publicatsLlevats = llevats.filter(r => r.discourse_topic_id);

const perill = idsPerduts.length > 0 || publicatsLlevats.length > 0;

if (perill) {
  console.log('    ' + '!'.repeat(56));
  console.log('    ATENCIÓ: aquesta importació perdria temes ja publicats.');
  console.log('    ' + '!'.repeat(56));
  if (idsPerduts.length) {
    console.log(`    ${idsPerduts.length} node(s) es quedarien SENSE discourse_topic_id:`);
    idsPerduts.slice(0, 10).forEach(m =>
      console.log(`      ${m.id.padEnd(26)} perdria el tema ${m.abans}`));
    if (idsPerduts.length > 10) console.log(`      ... i ${idsPerduts.length - 10} més`);
  }
  if (publicatsLlevats.length) {
    console.log(`    ${publicatsLlevats.length} node(s) publicats desapareixerien del CSV:`);
    publicatsLlevats.slice(0, 10).forEach(r =>
      console.log(`      ${r.id.padEnd(26)} tema ${r.discourse_topic_id}`));
  }
  console.log('');
  console.log('    Si continues, la pròxima publicació intentarà tornar a crear');
  console.log('    aquests temes i acabaries amb DUPLICATS al fòrum.');
  console.log('    Causa habitual: el CSV que importes és més vell que el que tens.');
  console.log('');
}

// Un canvi en el nombre de columnes sol voler dir que el fitxer és d'una altra
// època: `actiu` es va afegir el 2026-09-11 i les exportacions anteriors en
// tenen 21 en lloc de 22.
if (vell.headers.length !== nou.headers.length) {
  console.log(`    AVÍS: el nombre de columnes canvia (${vell.headers.length} → ${nou.headers.length}).`);
  const perdudes = vell.headers.filter(h => !nou.headers.includes(h));
  if (perdudes.length) console.log(`    Es perdrien: ${perdudes.join(', ')}`);
  console.log('    Sol indicar que el fitxer que importes és d\'una altra època.');
  console.log('');
}

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

// Codi 3 = hi ha pèrdua de temes publicats. El menú l'agafa per a demanar una
// confirmació escrita en lloc del s/N de sempre.
if (perill) process.exit(3);
