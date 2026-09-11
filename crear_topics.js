#!/usr/bin/env node
// =============================================================================
// crear_topics.js — Dolçaina i Tabalet · Skill Tree
// Llig el CSV de nodes, crea topics a Discourse per als que no en tinguen,
// actualitza el CSV amb els IDs nous i puja nodes.json a GitHub.
//
// Ús:
//   node crear_topics.js                 publica de veritat (Discourse + GitHub)
//   node crear_topics.js --dry-run       ensenya el pla, no toca res
//   node crear_topics.js --only-nodes    només regenera nodes.json
//   node crear_topics.js --validate      només valida el CSV i ix
//   node crear_topics.js --force-all     reenvia tots els nodes ja publicats
//   node crear_topics.js --skip-validation   ignora els errors de validació
// =============================================================================

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH    = './GiT_nodes.csv';
const NODES_PATH  = './nodes.json';
const CONFIG_PATH = './config.json';
const IDS_PATH    = './ids_nous.csv';

// L'id del full viu a config.json, que NO es versiona. No és una credencial,
// però el full està compartit en mode lectura per enllaç: qui en sàpiga l'id
// el pot llegir. Deixar-lo al codi d'un repositori públic seria publicar-lo.
// Només serveix per a BAIXAR; per a escriure-hi caldria l'API de Sheets amb un
// compte de servei (vegeu docs/MILLORES.md M-13).

// Node arrel de l'arbre: l'únic que pot no tindre prerequisits.
const ARREL = 'GiT_INICI';

// Tipus de material que index.html sap pintar (vegeu openModal()).
const TIPUS_MATERIAL = ['video', 'image', 'pdf', 'mp3', 'mp4', 'link'];

const CONFIG = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

// ─── CSV ─────────────────────────────────────────────────────────────────────

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim() !== '')
    .map(l => {
      const vals = parseCsvRow(l);
      const row = {};
      headers.forEach((h, i) => row[h] = vals[i] ?? '');
      return row;
    });
}

function parseCsvRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function serializeCsv(rows, headers) {
  const escape = val => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.join(',');
  const body = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [head, ...body].join('\n') + '\n';
}

// ─── DISCOURSE ───────────────────────────────────────────────────────────────

function extractYouTubeUrl(iframeOrUrl) {
  // URL directa (youtube.com o youtu.be)
  if (iframeOrUrl.startsWith('http')) return iframeOrUrl;
  // iframe HTML → extreu la URL
  const srcMatch = iframeOrUrl.match(/src="([^"]+)"/);
  if (!srcMatch) return null;
  const embedUrl = srcMatch[1];
  const idMatch = embedUrl.match(/\/embed\/([^?&]+)/);
  if (!idMatch) return embedUrl;
  return `https://www.youtube.com/watch?v=${idMatch[1]}`;
}

function generarCos(row) {
  const lines = [];
  lines.push(row.descripcio);
  lines.push('');
  lines.push(`**Família:** ${row.familia}`);
  if (row.tags)        lines.push(`**Etiquetes:** ${row.tags.split(',').map(t => `\`${t.trim()}\``).join(' ')}`);
  if (row.prerequisits) lines.push(`**Prerequisits:** ${row.prerequisits.split(',').map(p => `\`${p.trim()}\``).join(', ')}`);

  const materials = [
    { tipus: row.mat1_tipus, nom: row.mat1_nom, url: row.mat1_url },
    { tipus: row.mat2_tipus, nom: row.mat2_nom, url: row.mat2_url },
  ].filter(m => m.tipus);

  if (materials.length > 0) {
    lines.push('');
    lines.push('## Material didàctic');
    materials.forEach(m => {
      // El títol només si n'hi ha: `**${m.nom}**` amb el nom buit escriu
      // quatre asteriscs pelats al post. El validador ara ho avisa, però
      // aquesta guarda evita que arribe al fòrum si algú se'l salta.
      if (m.tipus === 'video') {
        const ytUrl = extractYouTubeUrl(m.url);
        lines.push('');
        if (m.nom) lines.push(`**${m.nom}**`);
        if (ytUrl) lines.push(ytUrl); // Discourse fa l'embed automàticament
      } else if (m.tipus === 'image') {
        const driveMatch = m.url && (m.url.match(/\/d\/([a-zA-Z0-9_-]+)/) || m.url.match(/[?&]id=([a-zA-Z0-9_-]+)/));
        const directUrl = driveMatch ? `https://drive.google.com/uc?export=view&id=${driveMatch[1]}` : m.url;
        lines.push('');
        if (m.nom) lines.push(`**${m.nom}**`);
        if (directUrl) lines.push(`![${m.nom || 'material'}](${directUrl})`);
      } else {
        const etiqueta = m.url ? `[${m.nom}](${m.url})` : m.nom;
        lines.push(`- **${m.tipus.toUpperCase()}** · ${etiqueta}`);
      }
    });
  }

  if (row.es_fita === 'TRUE' && row.fita_nom) {
    lines.push('');
    lines.push(`## ${row.fita_icona} Fita: ${row.fita_nom}`);
    if (row.fita_descripcio) lines.push(`> ${row.fita_descripcio}`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`*Node \`${row.id}\` · [Arbre de Fites](https://elawesomepanda.github.io/dolcaina-skill-tree) — Taller de Dolçaina i Tabalet · Ateneu L'Ardada*`);

  return lines.join('\n');
}

function discourseHeaders() {
  return {
    'Content-Type': 'application/json',
    'Api-Key':      CONFIG.DISCOURSE_API_KEY,
    'Api-Username': CONFIG.DISCOURSE_API_USERNAME,
  };
}

async function crearTopic(row) {
  const base = CONFIG.DISCOURSE_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/posts.json`, {
    method: 'POST',
    headers: discourseHeaders(),
    body: JSON.stringify({
      title:    row.titol,
      raw:      generarCos(row),
      category: CONFIG.DISCOURSE_CATEGORY_ID,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.topic_id) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).substring(0, 200)}`);
  }
  return data.topic_id;
}

async function actualitzarTopic(topicId, row) {
  const base = CONFIG.DISCOURSE_BASE_URL.replace(/\/$/, '');
  // Obtenim l'ID del primer post del topic
  const topicRes = await fetch(`${base}/t/${topicId}.json`, { headers: discourseHeaders() });
  if (!topicRes.ok) throw new Error(`HTTP ${topicRes.status} en llegir topic ${topicId}`);
  const topicData = await topicRes.json();
  const postId = topicData.post_stream.posts[0].id;

  // Actualitzem el contingut del post
  const updateRes = await fetch(`${base}/posts/${postId}.json`, {
    method: 'PUT',
    headers: discourseHeaders(),
    body: JSON.stringify({ post: { raw: generarCos(row) } }),
  });
  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`HTTP ${updateRes.status}: ${err.substring(0, 200)}`);
  }
}

// ─── NODES.JSON ──────────────────────────────────────────────────────────────

function filelaANode(row) {
  const esFita = row.es_fita === 'TRUE';
  const node = {
    id:           row.id,
    familia:      row.familia,
    tags:         splitComa(row.tags),
    titol:        row.titol,
    descripcio:   row.descripcio,
    prerequisits: splitComa(row.prerequisits),
    es_fita:      esFita,
  };
  if (esFita) {
    node.fita = {
      nom:                  row.fita_nom,
      descripcio:           row.fita_descripcio,
      icona:                row.fita_icona,
      discourse_badge_id:   row.discourse_badge_id ? parseInt(row.discourse_badge_id) : null,
      discourse_badge_name: row.discourse_badge_name,
    };
  }
  node.discourse_topic_id = row.discourse_topic_id ? parseInt(row.discourse_topic_id) : null;
  // Un node sense tema al fòrum es dibuixa «en preparació»: visible, però no
  // es pot completar ni compta per al progrés. Vegeu esPublicat().
  node.publicat = esPublicat(row);
  const materials = [
    { tipus: row.mat1_tipus, nom: row.mat1_nom, url: row.mat1_url },
    { tipus: row.mat2_tipus, nom: row.mat2_nom, url: row.mat2_url },
  ].filter(m => m.tipus);
  node.material = materials;
  return node;
}

function splitComa(s) {
  if (!s || s.trim() === '') return [];
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

// Un node està PUBLICAT si té tema al fòrum. Els que no ho estan es dibuixen
// igualment a l'arbre, però en estat «en preparació»: no es poden completar i
// no compten per al progrés.
// El criteri NO pot ser valid=TRUE: GiT_INICI és l'arrel i té valid=FALSE.
function esPublicat(row) {
  return Boolean(row.id && row.discourse_topic_id);
}

// Un node ACTIU és el que s'exporta a nodes.json, és a dir, el que es dibuixa.
// Serveix per a amagar branques senceres temporalment sense tocar res del fòrum.
//
// Buit o absent = actiu. Així, afegir la columna al full no amaga res per
// accident, i un CSV antic sense la columna es continua comportant igual.
//
// Les tres columnes són independents:
//   actiu               → es veu a l'arbre
//   valid               → l'script el publica/actualitza al fòrum
//   discourse_topic_id  → ja està publicat (si no, ix «en preparació»)
function esActiu(row) {
  return row.actiu !== 'FALSE';
}

// ─── VALIDACIÓ ───────────────────────────────────────────────────────────────
//
// Cada problema detectat porta un suggeriment concret d'arreglament, en termes
// del CSV (quina cel·la tocar), no en termes del codi.
//
//   nivell 'error' → para l'execució (es pot forçar amb --skip-validation)
//   nivell 'avis'  → informa i continua

// Distància de Levenshtein, per a suggerir ids semblants quan n'hi ha un de mal
// escrit. Prou ràpida per a 73 nodes.
function distancia(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const act = [i];
    for (let j = 1; j <= n; j++) {
      act[j] = Math.min(
        prev[j] + 1,
        act[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = act;
  }
  return prev[n];
}

// Torna l'id existent més paregut a `id`, o null si cap s'hi assembla prou.
function idMesParegut(id, candidats) {
  let millor = null, minim = Infinity;
  for (const c of candidats) {
    const d = distancia(id.toLowerCase(), c.toLowerCase());
    if (d < minim) { minim = d; millor = c; }
  }
  // Acceptem fins a un terç de la longitud com a diferència.
  return minim <= Math.max(2, Math.floor(id.length / 3)) ? millor : null;
}

// Busca cicles de prerequisits amb un DFS de tres colors.
// Retorna un array de camins, cadascun acabant en el node que tanca el cicle.
function detectarCicles(files, perId) {
  const estat  = new Map(); // 1 = en curs, 2 = tancat
  const cicles = [];
  const cami   = [];

  function visita(id) {
    if (estat.get(id) === 2) return;
    if (estat.get(id) === 1) {
      cicles.push([...cami.slice(cami.indexOf(id)), id]);
      return;
    }
    if (!perId.has(id)) return; // prerequisit inexistent: ja es reporta a banda
    estat.set(id, 1);
    cami.push(id);
    splitComa(perId.get(id).prerequisits).forEach(visita);
    cami.pop();
    estat.set(id, 2);
  }

  files.forEach(r => visita(r.id));
  return cicles;
}

// Reprodueix isUnlocked() d'index.html: un node es desbloqueja quan TOTS els
// seus prerequisits estan completats, i només es pot completar si està publicat.
// Retorna els nodes publicats que no s'arribaran a desbloquejar mai.
// Compta només sobre els nodes que es dibuixen: un node amagat no el pot
// completar ningú, i incloure'l donaria un màxim assolible fals.
function nodesInassolibles(files, perId) {
  const publicats = new Set(files.filter(r => esPublicat(r) && esActiu(r)).map(r => r.id));
  const assolits  = new Set();
  let canvi = true;
  while (canvi) {
    canvi = false;
    for (const r of files) {
      if (assolits.has(r.id) || !publicats.has(r.id)) continue;
      const prereqs = splitComa(r.prerequisits)
        .filter(p => perId.has(p) && esActiu(perId.get(p)));
      if (prereqs.every(p => assolits.has(p))) { assolits.add(r.id); canvi = true; }
    }
  }
  return {
    assolibles:    assolits.size,
    publicats:     publicats.size,
    inassolibles:  [...publicats].filter(id => !assolits.has(id)),
  };
}

// Retorna un array de { nivell, text, suggeriment }.
function validar(rows) {
  const problemes = [];
  const error = (text, suggeriment) => problemes.push({ nivell: 'error', text, suggeriment });
  const avis  = (text, suggeriment) => problemes.push({ nivell: 'avis',  text, suggeriment });

  const files = rows.filter(r => r.id);

  // ids duplicats
  const perId = new Map();
  files.forEach(r => {
    if (perId.has(r.id)) {
      error(`id duplicat: "${r.id}" apareix més d'una vegada`,
            `Renombra'n una de les dues files. Ara mateix només es fa cas de la primera, ` +
            `i la segona s'ignora sencera.`);
    } else {
      perId.set(r.id, r);
    }
  });

  const publicats = new Set(files.filter(esPublicat).map(r => r.id));

  files.forEach(r => {
    const prereqs = splitComa(r.prerequisits);

    // prerequisits que no existeixen enlloc del CSV
    prereqs.filter(p => !perId.has(p)).forEach(p => {
      const parescut = idMesParegut(p, [...perId.keys()]);
      error(`${r.id}: el prerequisit "${p}" no existeix al CSV`,
            parescut
              ? `Volies dir "${parescut}"? Corregeix la cel·la prerequisits de ${r.id}.`
              : `Crea el node "${p}", o lleva'l de la cel·la prerequisits de ${r.id}.`);
    });

    // Un node ACTIU que depén d'un d'AMAGAT no arriba mai a desbloquejar-se:
    // el prerequisit ni tan sols és a nodes.json. Mateix problema que el de
    // sota, però causat per la columna `actiu`.
    if (esActiu(r)) {
      prereqs.filter(p => perId.has(p) && !esActiu(perId.get(p))).forEach(p => {
        error(`${r.id} està actiu però depén de "${p}", que està amagat (actiu=FALSE)`,
              `Ni ${r.id} ni els seus descendents es podran desbloquejar mai. ` +
              `Activa "${p}", o amaga també ${r.id}.`);
      });
    }

    // un node publicat que depén d'un que no ho està (només si es dibuixa)
    if (esPublicat(r) && esActiu(r)) {
      prereqs.filter(p => perId.has(p) && !publicats.has(p)).forEach(p => {
        avis(`${r.id} està publicat però depén de "${p}", que encara no ho està`,
             `Mentre "${p}" estiga en preparació, ${r.id} no es podrà desbloquejar. ` +
             `Publica "${p}" (valid=TRUE i torna a executar) o despublica ${r.id}.`);
      });
    }

    // arrels inesperades (només compten les que es dibuixen)
    if (prereqs.length === 0 && r.id !== ARREL && esActiu(r)) {
      avis(`${r.id}: no té prerequisits, serà una segona arrel de l'arbre`,
           `Si havia de penjar d'algun node, ompli'n la cel·la prerequisits. ` +
           `L'única arrel prevista és ${ARREL}.`);
    }

    // fites incompletes
    if (r.es_fita === 'TRUE') {
      if (!r.fita_nom) {
        error(`${r.id}: es_fita=TRUE però fita_nom està buit`,
              `Ompli fita_nom, o posa es_fita=FALSE si no havia de ser fita.`);
      }
      // Una fita sense insígnia només és greu si el node ja està publicat:
      // buildBadgeMap() no la posarà al mapa i «Sincronitzar fites» no
      // desbloquejarà res, encara que l'alumne tinga la insígnia concedida.
      // Mentre és un esborrany, encara hi ha temps: només és un recordatori.
      if (!r.discourse_badge_id) {
        const com = `Crea-la a ${CONFIG.DISCOURSE_BASE_URL}/admin/badges i apunta'n ` +
                    `l'id numèric a discourse_badge_id.`;
        if (esPublicat(r)) {
          error(`${r.id}: està publicat, és fita, i discourse_badge_id està buit`,
                `${com} Fins llavors, «Sincronitzar fites» no desbloquejarà aquesta fita.`);
        } else {
          avis(`${r.id}: és fita i encara no té discourse_badge_id`,
               `${com} No corre pressa, però ha d'estar-hi ABANS de publicar-lo.`);
        }
      }
    }

    // materials
    for (const i of [1, 2]) {
      const tipus = r[`mat${i}_tipus`];
      if (!tipus) continue;
      if (!TIPUS_MATERIAL.includes(tipus)) {
        const parescut = idMesParegut(tipus, TIPUS_MATERIAL);
        error(`${r.id}: mat${i}_tipus "${tipus}" no és un tipus conegut`,
              parescut
                ? `Volies dir "${parescut}"? Tipus admesos: ${TIPUS_MATERIAL.join(', ')}.`
                : `Tipus admesos: ${TIPUS_MATERIAL.join(', ')}.`);
      }
      if (!r[`mat${i}_url`]) {
        error(`${r.id}: mat${i} és de tipus "${tipus}" però no té URL`,
              `Ompli mat${i}_url, o buida mat${i}_tipus per a llevar el material.`);
      } else if (!r[`mat${i}_nom`]) {
        // Al fòrum el nom es pinta en negreta. Amb el nom buit ixen quatre
        // asteriscs pelats (`****`), que és el que va passar als 14 nodes
        // d'ERM el 2026-09-11 i no es va veure fins a mirar el post.
        avis(`${r.id}: mat${i} ("${tipus}") no té nom`,
             `Ompli mat${i}_nom. Amb el nom buit, al fòrum ix «****».`);
      }
    }
  });

  // Amagar l'arrel deixaria l'arbre sense cap punt de partida.
  const arrel = perId.get(ARREL);
  if (arrel && !esActiu(arrel)) {
    error(`${ARREL} està amagat (actiu=FALSE), i és l'arrel de l'arbre`,
          `Sense arrel no hi ha res per on començar: posa-li actiu=TRUE.`);
  }

  // cicles
  detectarCicles(files, perId).forEach(c => {
    const ultim = c[c.length - 2], primer = c[c.length - 1];
    error(`cicle de prerequisits: ${c.join(' → ')}`,
          `Trenca el cicle llevant "${primer}" de la cel·la prerequisits de ${ultim}. ` +
          `Un cicle fa que aquests nodes no es puguen desbloquejar mai.`);
  });

  // nodes publicats que no s'arribaran a desbloquejar mai
  const { assolibles, publicats: nPub, inassolibles } = nodesInassolibles(files, perId);
  if (inassolibles.length > 0) {
    const pct = Math.round((assolibles / nPub) * 100);
    avis(`${inassolibles.length} nodes publicats no es podran desbloquejar mai: ` +
         `${inassolibles.join(', ')}`,
         `El progrés màxim assolible queda en ${pct} % (${assolibles} de ${nPub}). ` +
         `La causa sol ser un prerequisit sense publicar o un cicle: mira els altres avisos.`);
  }

  return problemes;
}

// Imprimeix el resultat. Retorna true si es pot continuar.
function informarValidacio(problemes, rows) {
  const sep = '─'.repeat(64);
  const errors = problemes.filter(p => p.nivell === 'error');
  const avisos = problemes.filter(p => p.nivell === 'avis');

  const mostra = (llista, titol, marca, log) => {
    if (llista.length === 0) return;
    log(`\n${sep}\n ${titol} (${llista.length})\n${sep}`);
    llista.forEach(p => {
      log(`  ${marca} ${p.text}`);
      if (p.suggeriment) log(`      → ${p.suggeriment}`);
    });
  };

  mostra(avisos, 'AVISOS', '!', console.warn);
  mostra(errors, 'ERRORS', '✗', console.error);

  const files   = rows.filter(r => r.id);
  const actius  = files.filter(esActiu);
  const nPub    = actius.filter(esPublicat).length;
  const amagats = files.length - actius.length;
  const cua = amagats > 0 ? `  ${amagats} amagats (actiu=FALSE).` : '';
  console.log(`\nCSV: ${files.length} nodes · a l'arbre ${actius.length} ` +
              `(${nPub} publicats, ${actius.length - nPub} en preparació).${cua}`);
  if (errors.length === 0 && avisos.length === 0) console.log('Validació: cap problema.');

  return errors.length === 0;
}

// ─── GITHUB ──────────────────────────────────────────────────────────────────

async function pushAGitHub(contingut) {
  const { GITHUB_TOKEN: token, GITHUB_OWNER: owner, GITHUB_REPO: repo,
          GITHUB_BRANCH: branch } = CONFIG;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/nodes.json`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
  };

  const getRes = await fetch(apiUrl, { headers });
  let sha = null;
  if (getRes.ok) sha = (await getRes.json()).sha;

  const payload = {
    message: `[auto] Actualitzar nodes.json — ${new Date().toISOString()}`,
    content: Buffer.from(contingut, 'utf8').toString('base64'),
    branch,
    ...(sha && { sha }),
  };

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub API ${putRes.status}: ${err.substring(0, 200)}`);
  }
}

function informarGeneracio(nodes, rows, sufix = '') {
  const nPub    = nodes.filter(n => n.publicat).length;
  const amagats = rows.filter(r => r.id).length - nodes.length;
  const cua = amagats > 0 ? ` ${amagats} amagats (actiu=FALSE) fora de l'arbre.` : '';
  console.log(`nodes.json generat (${nodes.length} nodes: ${nPub} publicats, ` +
              `${nodes.length - nPub} en preparació).${cua} ${sufix}`.trimEnd());
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const soloNodes = process.argv.includes('--only-nodes');
  const dryRun    = process.argv.includes('--dry-run');
  const soloValid = process.argv.includes('--validate');
  const skipValid = process.argv.includes('--skip-validation');

  const csvText = readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csvText);
  const headers = Object.keys(rows[0]);

  // Validació: sempre. Els errors paren l'execució abans de tocar res.
  const validacioOk = informarValidacio(validar(rows), rows);
  if (soloValid) process.exit(validacioOk ? 0 : 1);
  if (!validacioOk && !skipValid) {
    console.error('\nValidació fallida: no s\'ha modificat res.');
    console.error('Arregla el CSV, o força l\'execució amb --skip-validation.');
    process.exit(1);
  }

  // Mode ràpid: només regenerar nodes.json sense tocar Discourse ni GitHub
  if (soloNodes) {
    const nodes = rows.filter(r => r.id && esActiu(r)).map(filelaANode);
    const json  = JSON.stringify(nodes, null, 2);
    writeFileSync(NODES_PATH, json, 'utf8');
    informarGeneracio(nodes, rows, '[--only-nodes]');
    return;
  }

  const forceAll     = process.argv.includes('--force-all');

  const noValids     = rows.filter(r => r.id && r.valid !== 'TRUE');
  const valids       = rows.filter(r => r.id && r.valid === 'TRUE');
  const pendents     = valids.filter(r => !r.discourse_topic_id);
  const ambTopicId   = valids.filter(r =>  r.discourse_topic_id);
  const aActualitzar = ambTopicId.filter(r => forceAll || r.force_update === 'TRUE');
  const saltats      = ambTopicId.filter(r => !forceAll && r.force_update !== 'TRUE');

  console.log(`Nodes totals:      ${rows.filter(r => r.id).length}`);
  console.log(`  No vàlids:       ${noValids.length} (saltats)`);
  console.log(`  Vàlids:          ${valids.length}`);
  console.log(`    Ja publicats:  ${ambTopicId.length}`);
  console.log(`    → actualitzar: ${aActualitzar.length}${forceAll ? ' (--force-all)' : ''}`);
  console.log(`    → saltats:     ${saltats.length}`);
  console.log(`    A crear:       ${pendents.length}`);

  if (dryRun) {
    const sep = '─'.repeat(44);
    if (aActualitzar.length > 0) {
      console.log(`\n${sep}`);
      console.log(' ACTUALITZARIEN (force_update=TRUE)');
      console.log(sep);
      aActualitzar.forEach(r => console.log(`  ${r.id.padEnd(22)} topic ${r.discourse_topic_id}`));
    }
    if (pendents.length > 0) {
      console.log(`\n${sep}`);
      console.log(' ES CREARIEN (sense discourse_topic_id)');
      console.log(sep);
      pendents.forEach(r => console.log(`  ${r.id}`));
    }
    if (saltats.length > 0) {
      console.log(`\n${sep}`);
      console.log(' SALTATS (ja publicats, force_update buit)');
      console.log(sep);
      saltats.forEach(r => console.log(`  ${r.id.padEnd(22)} topic ${r.discourse_topic_id}`));
    }
    if (noValids.length > 0) {
      console.log(`\n${sep}`);
      console.log(' NO VÀLIDS (valid≠TRUE, ignorats)');
      console.log(sep);
      noValids.forEach(r => console.log(`  ${r.id}`));
    }
    console.log(`\n[DRY-RUN] Cap canvi fet. Llança sense --dry-run per executar.`);
    return;
  }

  const errorsCreacio    = [];
  const errorsActualitza = [];
  let creats = 0;
  let actualitzats = 0;

  // 1. Actualitzar topics marcats amb force_update (o tots si --force-all)
  if (aActualitzar.length > 0) {
    console.log('\nActualitzant topics a Discourse...');
    for (const row of aActualitzar) {
      try {
        await actualitzarTopic(parseInt(row.discourse_topic_id), row);
        console.log(`  ✓ ${row.id} (topic ${row.discourse_topic_id}) actualitzat`);
        actualitzats++;
        await new Promise(r => setTimeout(r, 700));
      } catch (e) {
        console.error(`  ✗ ${row.id}: ${e.message}`);
        errorsActualitza.push(row.id);
      }
    }
  }

  // 2. Crear topics nous (nodes sense discourse_topic_id)
  if (pendents.length > 0) {
    console.log('\nCreant topics nous a Discourse...');
    for (const row of pendents) {
      try {
        const topicId = await crearTopic(row);
        row.discourse_topic_id = String(topicId);
        console.log(`  ✓ ${row.id} → topic ${topicId}`);
        creats++;
        await new Promise(r => setTimeout(r, 700));
      } catch (e) {
        console.error(`  ✗ ${row.id}: ${e.message}`);
        errorsCreacio.push(row.id);
      }
    }
  }

  // Actualitzar CSV si hi ha IDs nous
  if (creats > 0) {
    writeFileSync(CSV_PATH, serializeCsv(rows, headers), 'utf8');
    console.log(`\nCSV actualitzat (${creats} IDs nous).`);
  }

  // Resum de topics creats per a actualitzar el CSV manualment si cal
  const creatsOk = pendents.filter(r => r.discourse_topic_id);
  if (creatsOk.length > 0) {
    const sep = '═'.repeat(44);
    console.log(`\n${sep}`);
    console.log(' TOPICS CREATS');
    console.log(sep);
    creatsOk.forEach(r => {
      console.log(` ${r.id.padEnd(22)} →  ${r.discourse_topic_id}`);
    });
    console.log(sep);

    // El CSV local ja porta els ids nous, però el FULL DE CÀLCUL no: d'ell
    // només sabem llegir. Deixem les dues columnes en un fitxer a banda per a
    // poder-les enganxar en bloc al full, en lloc d'anar id per id.
    const csvIds = ['id,discourse_topic_id']
      .concat(creatsOk.map(r => `${r.id},${r.discourse_topic_id}`))
      .join('\n') + '\n';
    writeFileSync(IDS_PATH, csvIds, 'utf8');
    console.log(`\nIds nous guardats a ${IDS_PATH} — enganxa'ls al full de càlcul.`);
    console.log("Mentre no ho faces, la pròxima importació del full els portarà");
    console.log("buits, i l'script tornaria a crear els temes DUPLICATS.");
  }

  console.log(`\nResum: ${actualitzats} actualitzats, ${creats} creats, ${saltats.length} saltats.`);
  const errors = [...errorsCreacio, ...errorsActualitza];

  // Generar nodes.json — només els nodes ACTIUS. El camp `publicat` distingeix
  // els que es poden completar dels que es dibuixen «en preparació».
  const nodes = rows.filter(r => r.id && esActiu(r)).map(filelaANode);
  const json  = JSON.stringify(nodes, null, 2);
  writeFileSync(NODES_PATH, json, 'utf8');
  informarGeneracio(nodes, rows);

  // Pujar a GitHub
  console.log('Pujant nodes.json a GitHub...');
  await pushAGitHub(json);
  console.log('Fet!');

  if (errors.length > 0) {
    console.warn(`\nErrors en ${errors.length} nodes: ${errors.join(', ')}`);
  }
}

main().catch(err => { console.error('Error fatal:', err.message); process.exit(1); });
