#!/usr/bin/env node
// =============================================================================
// insignies.mjs — Creua les fites del CSV amb les insígnies de Discourse.
//
// Resol la fricció de buscar a mà l'id numèric de cada insígnia: si al full ja
// hi ha el `discourse_badge_name`, ací el casa amb el fòrum i et dona l'id.
//
// Ús: node eines/insignies.mjs [fitxer_csv]
// Eixida: 0 sempre que s'haja pogut consultar el fòrum (les fites que falten
//         són informació, no un error).
// =============================================================================

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH    = process.argv[2] || './GiT_nodes.csv';
const CONFIG_PATH = './config.json';
const SORTIDA     = './badges_nous.csv';

// Prefix amb què es nomenen les insígnies d'aquest projecte al fòrum. Serveix
// per a separar-les de les que porta Discourse de sèrie.
const PREFIX_BADGE = 'GiT_';

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

function carregarCsv(ruta) {
  const lines = readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim() !== '')
    .map(l => {
      const vals = parseCsvRow(l);
      const row = {};
      headers.forEach((h, i) => row[h] = vals[i] ?? '');
      return row;
    })
    .filter(r => r.id);
}

// Distància de Levenshtein, per a suggerir noms pareguts quan no casen exacte.
function distancia(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const act = [i];
    for (let j = 1; j <= n; j++) {
      act[j] = Math.min(prev[j] + 1, act[j - 1] + 1,
                        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = act;
  }
  return prev[n];
}

const sep = '─'.repeat(64);

let CONFIG;
try {
  CONFIG = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
} catch {
  console.error(`  No trobe ${CONFIG_PATH}.`);
  process.exit(1);
}

let files;
try {
  files = carregarCsv(CSV_PATH);
} catch (e) {
  console.error(`  No he pogut llegir ${CSV_PATH}: ${e.message}`);
  process.exit(1);
}

// ─── Insígnies del fòrum ─────────────────────────────────────────────────────
// /badges.json és públic: no gasta l'API key.

const base = CONFIG.DISCOURSE_BASE_URL.replace(/\/$/, '');
console.log('  Consultant les insígnies del fòrum...');

let insignies;
try {
  const res = await fetch(`${base}/badges.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  insignies = (await res.json()).badges || [];
} catch (e) {
  console.error(`  No he pogut consultar el fòrum: ${e.message}`);
  process.exit(1);
}

console.log(`  ${insignies.length} insígnies al fòrum.\n`);

const perNom = new Map(insignies.map(b => [b.name, b]));
const perId  = new Map(insignies.map(b => [b.id, b]));

// ─── Creuament ───────────────────────────────────────────────────────────────

const fites      = files.filter(r => r.es_fita === 'TRUE');
const senseId    = [];   // fites amb el número buit
const idDolent   = [];   // fites amb un id que no existeix al fòrum
const desquadren = [];   // l'id existeix, però el nom del full no coincideix
const resolts    = [];   // per a badges_nous.csv

for (const r of fites) {
  const nom = (r.discourse_badge_name || '').trim();
  const idTxt = (r.discourse_badge_id || '').trim();

  if (!idTxt) {
    const casa = nom ? perNom.get(nom) : null;
    if (casa) {
      senseId.push({ r, nom, trobada: casa });
      resolts.push({ id: r.id, badgeId: casa.id });
    } else {
      // Sense coincidència exacta, busquem el nom més paregut per a orientar.
      let millor = null, minim = Infinity;
      if (nom) {
        for (const b of insignies) {
          const d = distancia(nom.toLowerCase(), b.name.toLowerCase());
          if (d < minim) { minim = d; millor = b; }
        }
        if (minim > Math.max(3, Math.floor(nom.length / 3))) millor = null;
      }
      senseId.push({ r, nom, trobada: null, parescuda: millor });
    }
    continue;
  }

  const id = parseInt(idTxt);
  const b = perId.get(id);
  if (!b) { idDolent.push({ r, id }); continue; }
  if (nom && b.name !== nom) desquadren.push({ r, id, nomFull: nom, nomForum: b.name });
}

// Insígnies del fòrum que cap node gasta.
//
// No serveix filtrar per id: Discourse en porta de pròpies amb ids alts
// (Daydreamer, Brainstormer, Innovator, Visionary...). El que sí que distingeix
// les de l'arbre és el prefix del nom, que és la convenció que ja se segueix.
// Si algun dia es crea una insígnia de l'arbre sense aquest prefix, no eixirà
// en aquesta llista.
const idsEnUs = new Set(fites.map(r => parseInt(r.discourse_badge_id)).filter(Boolean));
// Les que acabem de resoldre encara tenen la cel·la buida al full, però no són
// «sobrants»: en enganxar badges_nous.csv passaran a estar en ús.
resolts.forEach(x => idsEnUs.add(x.badgeId));
const propies = insignies.filter(b => b.name.startsWith(PREFIX_BADGE) && !idsEnUs.has(b.id));

// ─── Informe ─────────────────────────────────────────────────────────────────

const ambId    = senseId.filter(x => x.trobada);
const sensecap = senseId.filter(x => !x.trobada);

if (ambId.length > 0) {
  console.log(`${sep}\n FITES RESOLTES (${ambId.length}) — ja tens la insígnia creada\n${sep}`);
  ambId.forEach(({ r, trobada }) => {
    console.log(`  ${r.id.padEnd(24)} "${trobada.name}"  →  id ${trobada.id}`);
  });
  console.log('');
}

if (sensecap.length > 0) {
  console.log(`${sep}\n FITES SENSE INSÍGNIA AL FÒRUM (${sensecap.length})\n${sep}`);
  sensecap.forEach(({ r, nom, parescuda }) => {
    if (!nom) {
      console.log(`  ${r.id.padEnd(24)} el full no té ni discourse_badge_name`);
      console.log(`  ${' '.repeat(24)} → posa-li un nom i crea la insígnia al fòrum`);
    } else {
      console.log(`  ${r.id.padEnd(24)} "${nom}" no existeix al fòrum`);
      if (parescuda) {
        console.log(`  ${' '.repeat(24)} → n'hi ha una de pareguda: "${parescuda.name}" (id ${parescuda.id})`);
      } else {
        console.log(`  ${' '.repeat(24)} → crea-la a ${base}/admin/badges amb eixe nom exacte`);
      }
    }
  });
  console.log('');
}

if (idDolent.length > 0) {
  console.log(`${sep}\n IDS QUE NO EXISTEIXEN AL FÒRUM (${idDolent.length})\n${sep}`);
  idDolent.forEach(({ r, id }) => {
    console.log(`  ${r.id.padEnd(24)} discourse_badge_id=${id} no és cap insígnia`);
    console.log(`  ${' '.repeat(24)} → la sincronització no desbloquejarà aquesta fita`);
  });
  console.log('');
}

if (desquadren.length > 0) {
  console.log(`${sep}\n NOMS QUE NO QUADREN (${desquadren.length})\n${sep}`);
  desquadren.forEach(({ r, id, nomFull, nomForum }) => {
    console.log(`  ${r.id.padEnd(24)} id ${id} es diu "${nomForum}" al fòrum,`);
    console.log(`  ${' '.repeat(24)} però al full has escrit "${nomFull}"`);
    console.log(`  ${' '.repeat(24)} → l'id mana; el nom és només per a llegir-lo tu`);
  });
  console.log('');
}

if (propies.length > 0) {
  console.log(`${sep}\n INSÍGNIES DEL FÒRUM QUE NO GASTA CAP NODE (${propies.length})\n${sep}`);
  propies.sort((a, b) => a.id - b.id)
         .forEach(b => console.log(`  id ${String(b.id).padEnd(6)} ${b.name}`));
  console.log('');
}

// ─── Fitxer per a enganxar ───────────────────────────────────────────────────

if (resolts.length > 0) {
  const csv = ['id,discourse_badge_id']
    .concat(resolts.map(x => `${x.id},${x.badgeId}`))
    .join('\n') + '\n';
  writeFileSync(SORTIDA, csv, 'utf8');
  console.log(`  ${resolts.length} id(s) guardats a ${SORTIDA} — enganxa'ls al full.`);
} else if (sensecap.length === 0 && idDolent.length === 0) {
  console.log('  Totes les fites tenen la seua insígnia ben posada.');
} else {
  console.log('  Cap id nou per a enganxar: primer crea les insígnies que falten.');
}
