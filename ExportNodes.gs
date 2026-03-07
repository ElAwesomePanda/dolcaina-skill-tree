// =============================================================================
// ExportNodes.gs — Dolçaina i Tabalet · Skill Tree
// Llegeix el full "GiT_Nodes" i publica nodes.json a GitHub Pages
//
// CONFIGURACIÓ PRÈVIA (una sola vegada):
//   Apps Script → Projecte → Propietats del projecte → Propietats de l'script
//   Afegir les claus:
//     GITHUB_TOKEN  → ghp_XXXXXXXXXXXXXXXXXXXX
//     GITHUB_OWNER  → elawesomepanda
//     GITHUB_REPO   → dolcaina-skill-tree
//     GITHUB_BRANCH → main
// =============================================================================

const SHEET_NAME  = 'GiT_Nodes';
const GITHUB_PATH = 'nodes.json';

// Índexs de columna (0-based), corresponen a la capçalera del CSV:
// id | familia | tags | titol | descripcio | prerequisits | es_fita |
// fita_nom | fita_descripcio | fita_icona | discourse_badge_name |
// discourse_badge_id | discourse_topic_id |
// mat1_tipus | mat1_nom | mat1_url | mat2_tipus | mat2_nom | mat2_url
const COL = {
  id:                   0,
  familia:              1,
  tags:                 2,
  titol:                3,
  descripcio:           4,
  prerequisits:         5,
  es_fita:              6,
  fita_nom:             7,
  fita_descripcio:      8,
  fita_icona:           9,
  discourse_badge_name: 10,
  discourse_badge_id:   11,
  discourse_topic_id:   12,
  mat1_tipus:           13,
  mat1_nom:             14,
  mat1_url:             15,
  mat2_tipus:           16,
  mat2_nom:             17,
  mat2_url:             18,
};

// =============================================================================
// PUNT D'ENTRADA — cridat des del menú
// =============================================================================
function exportarNodes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Error: no s'ha trobat el full "${SHEET_NAME}".`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  // Fila 0 = capçaleres, saltem-la
  const files = data.slice(1).filter(row => String(row[COL.id]).trim() !== '');

  const nodes = files.map(filelaANode);
  const json  = JSON.stringify(nodes, null, 2);

  try {
    pushAGitHub(json);
    SpreadsheetApp.getUi().alert(`nodes.json publicat correctament (${nodes.length} nodes).`);
  } catch (e) {
    SpreadsheetApp.getUi().alert(`Error en publicar a GitHub:\n${e.message}`);
  }
}

// =============================================================================
// TRANSFORMACIÓ: fila → objecte node
// =============================================================================
function filelaANode(row) {
  const esFita = String(row[COL.es_fita]).trim().toUpperCase() === 'TRUE';

  const node = {
    id:           str(row[COL.id]),
    familia:      str(row[COL.familia]),
    tags:         splitComa(row[COL.tags]),
    titol:        str(row[COL.titol]),
    descripcio:   str(row[COL.descripcio]),
    prerequisits: splitComa(row[COL.prerequisits]),
    es_fita:      esFita,
  };

  if (esFita) {
    node.fita = {
      nom:                  str(row[COL.fita_nom]),
      descripcio:           str(row[COL.fita_descripcio]),
      icona:                str(row[COL.fita_icona]),
      discourse_badge_id:   entONull(row[COL.discourse_badge_id]),
      discourse_badge_name: str(row[COL.discourse_badge_name]),
    };
  }

  node.discourse_topic_id = entONull(row[COL.discourse_topic_id]);

  const material = [];
  afegirMaterial(material, row[COL.mat1_tipus], row[COL.mat1_nom], row[COL.mat1_url]);
  afegirMaterial(material, row[COL.mat2_tipus], row[COL.mat2_nom], row[COL.mat2_url]);
  node.material = material;

  return node;
}

// =============================================================================
// PUSH A GITHUB VIA API REST
// =============================================================================
function pushAGitHub(contingut) {
  const props  = PropertiesService.getScriptProperties().getProperties();
  const token  = props.GITHUB_TOKEN;
  const owner  = props.GITHUB_OWNER  || 'elawesomepanda';
  const repo   = props.GITHUB_REPO   || 'dolcaina-skill-tree';
  const branch = props.GITHUB_BRANCH || 'main';

  if (!token) throw new Error('Falta GITHUB_TOKEN a les propietats de l\'script.');

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_PATH}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
  };

  // 1. Obtenir SHA actual (necessari per fer PUT d'actualització)
  let sha = null;
  const getResp = UrlFetchApp.fetch(apiUrl, {
    headers,
    muteHttpExceptions: true,
  });
  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha;
  }

  // 2. Pujar el fitxer nou
  const payload = {
    message: `[auto] Actualitzar nodes.json — ${new Date().toISOString()}`,
    content: Utilities.base64Encode(contingut, Utilities.Charset.UTF_8),
    branch,
  };
  if (sha) payload.sha = sha;

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    contentType: 'application/json',
    headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = putResp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error(`GitHub API resposta ${code}: ${putResp.getContentText()}`);
  }
}

// =============================================================================
// UTILITATS
// =============================================================================

/** Converteix cel·la a string net. */
function str(val) {
  return String(val == null ? '' : val).trim();
}

/** Converteix cel·la a enter, o null si buida/invàlida. */
function entONull(val) {
  const s = str(val);
  if (s === '') return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/** Separa string per comes en array, filtrant buits. */
function splitComa(val) {
  const s = str(val);
  if (s === '') return [];
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

/** Afegeix un ítem de material si el tipus no és buit. */
function afegirMaterial(arr, tipus, nom, url) {
  const t = str(tipus);
  if (t === '') return;
  arr.push({ tipus: t, nom: str(nom), url: str(url) });
}

// =============================================================================
// MENÚ PERSONALITZAT
// =============================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Skill Tree')
    .addItem('Exportar nodes.json a GitHub', 'exportarNodes')
    .addToUi();
}
