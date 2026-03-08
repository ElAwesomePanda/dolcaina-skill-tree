#!/usr/bin/env node
// =============================================================================
// crear_topics.js — Dolçaina i Tabalet · Skill Tree
// Llegeix GiT_Nodes.csv, crea topics a Discourse per als nodes que no en
// tinguin, actualitza el CSV amb els IDs nous i puja nodes.json a GitHub.
//
// Ús: node crear_topics.js
// =============================================================================

import { readFileSync, writeFileSync } from 'fs';

const CONFIG = JSON.parse(readFileSync('./config.json', 'utf8'));

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

function extractYouTubeUrl(iframeHtml) {
  const srcMatch = iframeHtml.match(/src="([^"]+)"/);
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
      if (m.tipus === 'video') {
        const ytUrl = extractYouTubeUrl(m.url);
        lines.push('');
        lines.push(`**${m.nom}**`);
        if (ytUrl) lines.push(ytUrl); // Discourse fa l'embed automàticament
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const soloNodes = process.argv.includes('--only-nodes');

  const csvText = readFileSync('./GiT_Nodes.csv', 'utf8');
  const rows = parseCsv(csvText);
  const headers = Object.keys(rows[0]);

  // Mode ràpid: només regenerar nodes.json sense tocar Discourse ni GitHub
  if (soloNodes) {
    const nodes = rows.filter(r => r.id).map(filelaANode);
    const json  = JSON.stringify(nodes, null, 2);
    writeFileSync('./nodes.json', json, 'utf8');
    console.log(`nodes.json generat (${nodes.length} nodes). [--only-nodes, sense Discourse ni GitHub]`);
    return;
  }

  const pendents    = rows.filter(r => r.id && !r.discourse_topic_id);
  const ambTopicId  = rows.filter(r => r.id &&  r.discourse_topic_id);

  console.log(`Nodes totals:      ${rows.filter(r => r.id).length}`);
  console.log(`Ja amb topic ID:   ${ambTopicId.length}`);
  console.log(`Sense topic ID:    ${pendents.length}`);

  const errorsCreacio    = [];
  const errorsActualitza = [];
  let creats = 0;
  let actualitzats = 0;

  // 1. Actualitzar topics existents
  if (ambTopicId.length > 0) {
    console.log('\nActualitzant topics existents a Discourse...');
    for (const row of ambTopicId) {
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
    writeFileSync('./GiT_Nodes.csv', serializeCsv(rows, headers), 'utf8');
    console.log(`\nCSV actualitzat (${creats} IDs nous).`);
  }

  // Resum de topics creats per a actualitzar el CSV manualment si cal
  const creatsOk = pendents.filter(r => r.discourse_topic_id);
  if (creatsOk.length > 0) {
    const sep = '═'.repeat(44);
    console.log(`\n${sep}`);
    console.log(' TOPICS CREATS — copia al CSV si cal');
    console.log(sep);
    creatsOk.forEach(r => {
      console.log(` ${r.id.padEnd(22)} →  ${r.discourse_topic_id}`);
    });
    console.log(sep);
  }

  console.log(`\nResum: ${actualitzats} actualitzats, ${creats} creats.`);
  const errors = [...errorsCreacio, ...errorsActualitza];

  // Generar nodes.json
  const nodes = rows.filter(r => r.id).map(filelaANode);
  const json  = JSON.stringify(nodes, null, 2);
  writeFileSync('./nodes.json', json, 'utf8');
  console.log(`nodes.json generat (${nodes.length} nodes).`);

  // Pujar a GitHub
  console.log('Pujant nodes.json a GitHub...');
  await pushAGitHub(json);
  console.log('Fet!');

  if (errors.length > 0) {
    console.warn(`\nErrors en ${errors.length} nodes: ${errors.join(', ')}`);
  }
}

main().catch(err => { console.error('Error fatal:', err.message); process.exit(1); });
