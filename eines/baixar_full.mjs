#!/usr/bin/env node
// =============================================================================
// baixar_full.mjs — Descarrega el full de càlcul com a CSV.
//
// El fa servir eines/menu.ps1 (opció 1). Escriu el fitxer i prou: qui decideix
// si substitueix el CSV del projecte és el menú, després d'ensenyar els canvis.
//
// Ús: node eines/baixar_full.mjs <fitxer_destí>
// Eixida: 0 si tot bé, 1 si hi ha hagut cap problema.
// =============================================================================

import { readFileSync, writeFileSync } from 'fs';

// L'id del full viu a config.json, que NO es versiona. No és una credencial,
// però el full està compartit per enllaç en mode lectura: qui en sàpiga l'id
// el pot llegir, i el repositori és públic.
const CONFIG_PATH = './config.json';

let CONFIG;
try {
  CONFIG = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
} catch {
  console.error(`  No trobe ${CONFIG_PATH}.`);
  process.exit(1);
}

const { SHEET_ID, SHEET_GID } = CONFIG;
if (!SHEET_ID || !SHEET_GID) {
  console.error('  A config.json falten SHEET_ID i/o SHEET_GID.');
  console.error('  Es trauen de la URL del full:');
  console.error('    docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<SHEET_GID>');
  process.exit(1);
}

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

// Primera columna que ha de portar el CSV. Serveix de comprovació barata que
// el que ens ha arribat és el full correcte i no una pàgina d'error.
const PRIMERA_COLUMNA = 'id,valid,force_update,';

const desti = process.argv[2];
if (!desti) {
  console.error("Ús: node eines/baixar_full.mjs <fitxer_destí>");
  process.exit(2);
}

console.log('  Descarregant el full de càlcul...');

let res;
try {
  res = await fetch(SHEET_URL, { redirect: 'follow' });
} catch (e) {
  console.error(`  No hi ha manera de connectar: ${e.message}`);
  console.error('  Comprova que tens internet.');
  process.exit(1);
}

// Google no torna 403 quan el full és privat: torna 401 amb una pàgina de
// login en HTML. Si ens la guardàrem tal qual, el CSV del projecte quedaria
// substituït per codi HTML i l'error apareixeria molt més tard i molt pitjor.
if (!res.ok) {
  console.error(`  El full ha respost HTTP ${res.status}.`);
  if (res.status === 401 || res.status === 403) {
    console.error('  Vol dir que no és accessible sense iniciar sessió.');
    console.error('  Al full: Comparteix → Accés general → "Qualsevol amb l\'enllaç" (Lector).');
  }
  process.exit(1);
}

const text = await res.text();
const tipus = res.headers.get('content-type') || '';

if (!tipus.includes('csv') || !text.startsWith(PRIMERA_COLUMNA)) {
  console.error('  El que ha arribat no és el CSV que esperàvem.');
  console.error(`  Content-Type: ${tipus || '(cap)'}`);
  console.error(`  Comença per:  ${text.slice(0, 60).replace(/\n/g, ' ')}`);
  console.error('');
  console.error('  Causes habituals: el full no és públic, o el gid apunta a una');
  console.error('  pestanya que no és la dels nodes.');
  process.exit(1);
}

const files = text.replace(/\r\n/g, '\n').split('\n')
  .slice(1).filter(l => l.trim() && l[0] !== ',').length;

if (files === 0) {
  console.error('  El full ha arribat però no té cap fila amb id. Sospitós: no el guarde.');
  process.exit(1);
}

writeFileSync(desti, text, 'utf8');
console.log(`  Rebut: ${files} nodes, ${(text.length / 1024).toFixed(1)} KB.`);
