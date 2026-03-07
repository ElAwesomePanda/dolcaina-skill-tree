// =============================================================================
// ExportDiscourseTopics.gs — Dolçaina i Tabalet · Skill Tree
// Crea un topic a Discourse per cada node que no en tingui
//
// CONFIGURACIÓ PRÈVIA (PropertiesService):
//   DISCOURSE_API_KEY      → clau API de Discourse (admin)
//   DISCOURSE_API_USERNAME → username de l'admin que firma les peticions
//   DISCOURSE_BASE_URL     → https://ardada.discoursehosting.net
//   DISCOURSE_CATEGORY_ID  → ID de la categoria on crear els topics
// =============================================================================

// Índex de la columna discourse_topic_id al full (0-based)
const TOPIC_ID_COL = 12; // columna M (0-based), = columna 13 del Sheet (1-based)

// =============================================================================
// PUNT D'ENTRADA
// =============================================================================
function crearTopicsDiscourse() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Error: no s'ha trobat el full "${SHEET_NAME}".`);
    return;
  }

  const props = PropertiesService.getScriptProperties().getProperties();
  const apiKey      = props.DISCOURSE_API_KEY;
  const apiUser     = props.DISCOURSE_API_USERNAME;
  const baseUrl     = (props.DISCOURSE_BASE_URL || 'https://ardada.discoursehosting.net').replace(/\/$/, '');
  const categoryId  = parseInt(props.DISCOURSE_CATEGORY_ID || '1', 10);

  if (!apiKey || !apiUser) {
    SpreadsheetApp.getUi().alert('Falta DISCOURSE_API_KEY o DISCOURSE_API_USERNAME a les propietats de l\'script.');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // fila 0 = capçaleres

  let creats = 0, saltats = 0, errors = [];

  rows.forEach((row, i) => {
    const id = str(row[COL.id]);
    if (!id) return; // fila buida

    const topicIdActual = str(row[COL.discourse_topic_id]);
    if (topicIdActual !== '' && topicIdActual !== '0') {
      saltats++;
      return; // ja té topic, saltar
    }

    try {
      const nouTopicId = crearTopic(row, apiKey, apiUser, baseUrl, categoryId);
      // Escriure l'ID de volta al Sheet (fila i+2 perquè el Sheet és 1-based i la fila 1 és capçalera)
      sheet.getRange(i + 2, TOPIC_ID_COL + 1).setValue(nouTopicId);
      Logger.log(`✓ ${id} → topic ${nouTopicId}`);
      creats++;
      Utilities.sleep(700); // Respectar rate limit de Discourse (~60 req/min)
    } catch (e) {
      Logger.log(`✗ ${id}: ${e.message}`);
      errors.push(`${id}: ${e.message}`);
    }
  });

  // Resum
  let missatge = `Topics nous creats: ${creats}\nJa existien (saltats): ${saltats}`;
  if (errors.length > 0) missatge += `\nErrors (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
  SpreadsheetApp.getUi().alert(missatge);

  // Si s'han creat topics, oferir re-exportar nodes.json
  if (creats > 0) {
    const ui = SpreadsheetApp.getUi();
    const resp = ui.alert(
      'Exportar nodes.json?',
      `S'han creat ${creats} topics nous amb els seus IDs. Vols exportar nodes.json a GitHub ara?`,
      ui.ButtonSet.YES_NO
    );
    if (resp === ui.Button.YES) exportarNodes();
  }
}

// =============================================================================
// CREAR UN TOPIC A DISCOURSE
// =============================================================================
function crearTopic(row, apiKey, apiUser, baseUrl, categoryId) {
  const titol = str(row[COL.titol]);
  const raw   = generarCossTopic(row);

  const resp = UrlFetchApp.fetch(`${baseUrl}/posts.json`, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Api-Key':      apiKey,
      'Api-Username': apiUser,
    },
    payload: JSON.stringify({
      title:    titol,
      raw:      raw,
      category: categoryId,
    }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error(`HTTP ${code}: ${resp.getContentText().substring(0, 200)}`);
  }

  const body = JSON.parse(resp.getContentText());
  if (!body.topic_id) throw new Error(`Resposta sense topic_id: ${resp.getContentText().substring(0, 200)}`);

  return body.topic_id;
}

// =============================================================================
// GENERAR EL COS DEL TOPIC EN MARKDOWN
// =============================================================================
function generarCossTopic(row) {
  const id          = str(row[COL.id]);
  const descripcio  = str(row[COL.descripcio]);
  const familia     = str(row[COL.familia]);
  const tagsStr     = str(row[COL.tags]);
  const prerequisits = str(row[COL.prerequisits]);
  const esFita      = str(row[COL.es_fita]).toUpperCase() === 'TRUE';
  const fitaNom     = str(row[COL.fita_nom]);
  const fitaDesc    = str(row[COL.fita_descripcio]);
  const fitaIcona   = str(row[COL.fita_icona]);

  const lines = [];

  lines.push(descripcio);
  lines.push('');
  lines.push(`**Família:** ${familia}`);
  if (tagsStr)      lines.push(`**Etiquetes:** ${tagsStr.split(',').map(t => `\`${t.trim()}\``).join(' ')}`);
  if (prerequisits) lines.push(`**Prerequisits:** ${prerequisits.split(',').map(p => `\`${p.trim()}\``).join(', ')}`);

  // Material
  const materials = [
    { tipus: str(row[COL.mat1_tipus]), nom: str(row[COL.mat1_nom]), url: str(row[COL.mat1_url]) },
    { tipus: str(row[COL.mat2_tipus]), nom: str(row[COL.mat2_nom]), url: str(row[COL.mat2_url]) },
  ].filter(m => m.tipus !== '');

  if (materials.length > 0) {
    lines.push('');
    lines.push('## Material didàctic');
    materials.forEach(m => {
      const etiqueta = m.url ? `[${m.nom}](${m.url})` : m.nom;
      lines.push(`- **${m.tipus.toUpperCase()}** · ${etiqueta}`);
    });
  }

  // Fita
  if (esFita && fitaNom) {
    lines.push('');
    lines.push(`## ${fitaIcona} Fita: ${fitaNom}`);
    if (fitaDesc) lines.push(`> ${fitaDesc}`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`*Node \`${id}\` · [Arbre de Fites](https://elawesomepanda.github.io/dolcaina-skill-tree) — Taller de Dolçaina i Tabalet · Ateneu L'Ardada*`);

  return lines.join('\n');
}

// =============================================================================
// AFEGIR ENTRADES AL MENÚ (crida des de onOpen a ExportNodes.gs)
// =============================================================================
function afegirMenuDiscourse(menu) {
  return menu.addItem('Crear topics a Discourse (nodes nous)', 'crearTopicsDiscourse');
}
