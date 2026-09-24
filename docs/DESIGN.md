# DESIGN.md — Arbre de Fites · Dolçaina i Tabalet

> Document escrit **per a l'agent**. El lector previst és una sessió futura de
> Claude Code. Si la resposta és ací, no cal obrir el codi.
> Signatures i literals extrets amb `grep` el **2026-09-24**.

---

## 0. Invariants (llig açò primer)

1. **`nodes.json` és un fitxer generat.** La font de veritat és `GiT_nodes.csv`.
   Editar `nodes.json` a mà es perd a la següent execució de `crear_topics.js`.
2. **El CSV real no es versiona.** La font de veritat és `GiT_nodes.csv`, al
   disc de l'autor i al `.gitignore`. El repositori porta
   `GiT_nodes.exemple.csv` (4 files) perquè es puga entendre l'esquema. La ruta
   viu a la constant `CSV_PATH`, escrita una sola vegada.
3. **La columna `valid` NO filtra res de l'arbre.** És un interruptor de
   publicació per a `crear_topics.js` i prou. Prova: `GiT_INICI`, `PERC_PL_1` i
   `PERC_PL_2` tenen `valid=FALSE` i **estan publicats** — es van bloquejar
   perquè l'script no els tornara a tocar. El que decideix tot a l'arbre és
   `discourse_topic_id`, via `esPublicat()`.
3b. **Tres columnes independents decideixen coses diferents.** No confondre-les:

   | Columna | Decideix |
   | --- | --- |
   | `actiu` | Si el node **s'exporta a `nodes.json`**, és a dir, si es dibuixa |
   | `valid` | Si l'script el **publica o actualitza al fòrum** |
   | `discourse_topic_id` | Si **ja està publicat**; si no, ix «en preparació» |

   `actiu` buit o absent = actiu. Així un CSV sense la columna es comporta com
   abans, i afegir-la no amaga res per accident.

3c. **`nodes.json` porta els nodes ACTIUS, amb un camp `publicat`.** Els que el
   tenen a `false` es dibuixen «en preparació»: visibles, no clicables, i fora
   del càlcul del progrés.
4. **`prerequisits` és l'única font de les arestes.** No hi ha camp invers.
   Un prerequisit que apunte a un `id` inexistent s'ignora silenciosament
   (`validPrereqs = n.prerequisits.filter(p => nodeMap[p])`).
5. **Cap credencial pot entrar a un fitxer versionat.** `config.json` i
   `config.gs` estan al `.gitignore`. Vegeu §7 (Trampes) — açò ja s'ha trencat.
6. **Ni un node bloquejat ni un «en preparació» són clicables.**
   `div.on('click', ...)` només s'assigna si `unlocked`, i
   `unlocked = !preparacio && isUnlocked(n)`.
7. **`render()` esborra i redibuixa tot el SVG.** No hi ha actualització
   incremental. Qualsevol canvi d'estat implica `render()` complet, i això
   **reinicia el zoom i el desplaçament**.

---

## 1. Mapa de fitxers

| Fitxer | Versionat | Paper |
| --- | --- | --- |
| `index.html` | sí | Aplicació sencera: HTML + CSS + JS en un fitxer (1583 línies) |
| `nodes.json` | sí | Dades generades (els nodes actius) que carrega `index.html` |
| `GiT_nodes.csv` | **no** | Font de veritat de les dades. Viu al disc de l'autor |
| `GiT_nodes.exemple.csv` | sí | 4 files de mostra, per a entendre l'esquema |
| `crear_topics.js` | sí | Pipeline CSV → Discourse → `nodes.json` → GitHub |
| `package.json` | sí | `"type": "module"`, `engines`, scripts d'npm |
| `arbre.bat` | sí | Llançador de doble clic del menú |
| `eines/menu.ps1` | sí | El menú. **Ha d'estar desat en UTF-8 amb BOM** (§7.6) |
| `eines/comparar_csv.mjs` | sí | Compara dos CSV abans d'importar-ne un |
| `eines/baixar_full.mjs` | sí | Descarrega el full de càlcul com a CSV |
| `eines/insignies.mjs` | sí | Creua les fites del CSV amb les insígnies del fòrum |
| `badges_nous.csv` | **no** | Generat per l'opció 9: badge_id per a enganxar al full |
| `ids_nous.csv` | **no** | Generat en publicar: ids per a enganxar al full |
| `copies/` | **no** | Còpies del CSV i informes de validació |
| `proxy/worker.js` + `proxy/README.md` | sí | Cloudflare Worker i com recrear-lo |
| `docs/` | sí | Documentació del projecte |
| `.claude/launch.json` | sí | Servidor local per a la vista prèvia |
| `.claude/settings.local.json` | **no** | Permisos personals |
| `originaldesign.md` | sí | Proposta original (conté una API key — vegeu §7.1) |
| `config.json` | **no** | Credencials del pipeline Node |
| `config.gs`, `appsscript.json`, `.clasp.json`, `.claspignore` | **no** | Restes d'una versió Google Apps Script, abandonada |
| `LICENSE` | sí | MIT |

Dependència externa única de `index.html`: **D3 v7.9.0** des de
`https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js`.
Tipografies: `Cinzel` (400/600/700) i `Crimson Pro` via Google Fonts (`@import`).

---

## 2. Forma de les dades

### 2.1 Capçalera del CSV (22 columnes)

```
id,actiu,valid,force_update,familia,tags,titol,descripcio,prerequisits,es_fita,
fita_nom,fita_descripcio,fita_icona,discourse_badge_name,discourse_badge_id,
discourse_topic_id,mat1_tipus,mat1_nom,mat1_url,mat2_tipus,mat2_nom,mat2_url
```

**L'ordre no importa**: tot es llig pel nom de la columna. `actiu` es va afegir
el 2026-09-11 en segona posició, i res es va trencar tret de la comprovació de
`baixar_full.mjs` (§7.10).

- `actiu`, `valid` i `force_update` són les cadenes literals `TRUE` / `FALSE`.
  Qualsevol altra cosa (inclòs buit) es tracta com a fals.
- `tags` i `prerequisits` són llistes separades per comes **dins d'un camp
  entrecometat** (`"A,B"`), perquè el separador del CSV també és la coma.
- **Màxim 2 materials per node** (`mat1_*`, `mat2_*`). És una limitació dura de
  l'esquema, no una convenció.
- El fitxer té **1000 línies** però només **73 tenen `id`**. La resta són files
  buides d'una exportació de Google Sheets; `rows.filter(r => r.id)` les descarta.

### 2.2 Node a `nodes.json`

```json
{
  "id": "GiT_INICI",
  "familia": "General",
  "tags": ["Taller", "Benvinguda"],
  "titol": "Benvingut al Taller",
  "descripcio": "...",
  "prerequisits": [],
  "es_fita": true,
  "fita": {
    "nom": "Membre de la Gaita i el Tabalet",
    "descripcio": "...",
    "icona": "🥁",
    "discourse_badge_id": 112,
    "discourse_badge_name": "GiT_Membre"
  },
  "discourse_topic_id": 369,
  "publicat": true,
  "material": [{ "tipus": "video", "nom": "...", "url": "..." }]
}
```

- `fita` **només existeix si `es_fita === true`**. Accedir a `node.fita.nom` sense
  comprovar `es_fita` dona `TypeError: Cannot read properties of undefined`.
- `discourse_topic_id` és `null` quan el node encara no s'ha publicat.
- `publicat` és `Boolean(discourse_topic_id)`. `index.html` mira
  **`n.publicat === false`**, no la seua absència: un `nodes.json` vell sense el
  camp es continua comportant com abans (tots completables).
- `material` sempre és un array (pot ser buit).

### 2.3 Estat de les dades (2026-09-24)

- **91 nodes al CSV**, dels quals **43 actius** (els que es dibuixen) i
  **48 amagats** amb `actiu=FALSE`.

  | Branca | Prefix | Al CSV | Actius |
  | --- | --- | --- | --- |
  | Arrel | `GiT_INICI` | 1 | 1 |
  | Tocs bàsics | `PERC_PL`, `PERC_DE`, `PERC_DDEE`, `PERC_DEDx`, `PERC_PLD`, `PERC_PLE` | 24 | 24 |
  | Lateralitat (Lat. 001-011) | `PERC_LAT` | 48 | **0** |
  | St. Antoni L'ermità | `PERC_ERM` | 14 | 14 |
  | Nit de Llampecs | `PERC_LLAM` | 3 | 3 |
  | Dimonis de Massalfassar | `PERC_DIM` | 1 | 1 |

- Els 43 actius estan **tots publicats**; cap «en preparació». 11 fites al CSV.
- La lateralitat està amagada des del 2026-09-11 per a centrar les sessions del
  taller. Es desfà posant `actiu` a `TRUE`. **És una configuració temporal**:
  no la prengues com l'estat definitiu del projecte.
- El projecte ha passat d'exercicis solts a **peces del repertori**: ERM, LLAM i
  DIM són obres, no patrons. Les peces pengen de `GiT_INICI` o d'una altra peça.
- Arrel única: `GiT_INICI`.
- `PERC_ERM` té forma d'espina dorsal: els nodes `_01` fan la cadena principal i
  cada `_02` («Tota») penja del seu `_01` sense bloquejar el pas següent. Penja
  directament de `GiT_INICI`, per això amagar la resta no trenca el graf.
- **Cap node inassolible.** Lat. 009 es va arreglar el 2026-09-11 penjant
  `PERC_LAT_11_21_41_1` de `PERC_LAT_11_12_11_21_4`.
- Tipus de material presents: `video`, `image` i `mp3` (14 nodes d'ERM).
- Cap prerequisit penjant. Cap node sense descripció. Només `GiT_INICI` sense material.
- Etiquetes en ús: `Taller, Benvinguda, Tabal, Beat, Mètronom, Resistència, D-E,
  DD-EE, DEDx, PL-D, Combinació, PL-E, Lateralitat, 1/2, 1/4`.

---

## 3. `index.html` — funcions

### 3.1 Constants i estat global

| Nom | Valor | Notes |
| --- | --- | --- |
| `DISCOURSE_URL` | `https://ardada.discoursehosting.net` | Per als enllaços del modal |
| `PROXY_URL` | `https://dolcaina-discourse-proxy.guillem-reig-m.workers.dev` | Cloudflare Worker. Codi font i documentació a `proxy/` |
| `STATE_KEY` | `dolcaina_completed` | `localStorage`, array JSON d'ids |
| `USER_KEY` | `dolcaina_discourse_user` | `localStorage`, string |
| `NODE_W`, `NODE_H` | 200, 110 | px |
| `H_GAP`, `V_GAP` | 50, 80 | px |
| `NODES` | `[]` | s'omple a `init()` |
| `completed` | `Set` | ids completats |
| `discourseBadgeMap` | `{}` | `badge_id → [ids]`, construït a `init()` |
| `svg`, `g`, `zoomBehavior`, `nodeMap` | — | globals de D3, reassignades a cada `render()` |

Variables CSS (`:root`): `--bg #0e0c08`, `--bg2 #171410`, `--gold #c9a84c`,
`--gold-light #e8c87a`, `--gold-dim #7a6430`, `--cream #f0e6cc`,
`--cream-dim #9a8e78`, `--locked #1a1815`, `--locked-border #2a2520`,
`--locked-text #4a4438`, `--green #4a8c5c`, `--green-dim #3d6b4a`.

Els quatre estats visuals d'una targeta: `.node-card` (disponible),
`.completed`, `.locked`, `.preparacio`. El darrer és vora discontínua, fons
transparent, sense cantonada decorativa (`::before { display: none }`) i sense
cadenat.

### 3.2 Estat i progrés

- `saveState()` → `void`. Escriu `[...completed]` a `localStorage`.
- `isUnlocked(node)` → `boolean`. `node.prerequisits.every(p => completed.has(p))`.
  Un node sense prerequisits sempre és desbloquejat.
- `getCompletionPct()` → `number`. Denominador: els nodes amb
  `publicat !== false` (ara 40). Numerador: els ids de `completed` que estiguen
  en eixe conjunt. **Es filtren les dues bandes** perquè `completed` pot
  arrossegar ids del `localStorage` que ja no compten (esborranys marcats abans
  que existira l'estat «en preparació», o nodes llevats del CSV); sense el
  filtre el percentatge podria passar del 100 %.
- `updateProgress()` → `void`. Pinta `#progressFill` i `#progressPct`.

### 3.3 Layout (Sugiyama simplificat)

`computeLayout()` → `nodeMap` (`{id: node amb layer, pos, x, y}`).

1. `getLayer(id)` recursiu: capa = `max(capes dels prerequisits) + 1`, 0 si no en
   té. **Detecció de cicles amb la bandera `_computing`**: si es reentra en un
   node en curs, retorna `0` i talla. Açò evita el desbordament de pila que hi
   havia (vegeu §7.2).
2. Agrupació per capa.
3. Ordenació dins de cada capa per la mitjana de `pos` dels pares (heurística
   d'una sola passada per reduir encreuaments; **no** és el baricentre iteratiu
   de Sugiyama real).
4. `x = startX + i * (NODE_W + H_GAP)` centrat; `y = -(capa * (NODE_H + V_GAP))`
   — **negatiu**, perquè l'arbre creix cap amunt.

`badgeSVG(type, size=40)` → string SVG. Tipus: `shield`, `star`, `star2`,
`crown`. **CODI MORT**: definida a la línia 811 i mai cridada; les fites es
pinten amb l'emoji de `fita.icona`.

### 3.4 Render

`render()` → `void`. Buida `#canvas`, calcula `topH` de `.top-ui`, crea 3
`marker` de fletxa (`arrow-locked` `#2a2520`, `arrow-unlocked` `#7a6430`,
`arrow-completed` `#3d6b4a`), instal·la `d3.zoom()` amb
`scaleExtent([0.2, 3])`, dibuixa les arestes com a corbes de Bézier cúbiques
verticals i cada node com a `foreignObject` amb un `div.node-card` dins.
Acaba centrant la vista sobre la mitjana x dels nodes sense prerequisits, a
`y = (H - topH) * 0.85`, escala 1.

- Classes d'estat de la targeta: `.node-card`, `+ .completed`, `+ .locked`,
  `+ .preparacio`. Es decideixen amb aquest ordre de prioritat:
  `preparacio → completed → locked → (res, és a dir disponible)`.
- Textos de `.nc-status`: `En preparació` · `Completat` · `Disponible` ·
  `Bloquejat`.
- Contingut de la targeta: `.nc-id`, `.nc-title`, `.nc-badge`, `.nc-status`,
  més `.nc-lock` (🔒) o `.nc-check` (✓). **El cadenat no es pinta als nodes en
  preparació**: allà el que bloqueja no és el progrés de l'alumne.
- **`n.tags` i `n.familia` no es pinten mai a la targeta.** `familia` només
  apareix al modal.

### 3.5 Zoom i navegació

- `zoomIn()` → `scaleBy 1.3`. `zoomOut()` → `scaleBy 0.77`.
- `zoomReset()` → torna al transform inicial, escala 1.
- `jumpToLastUnlocked()` → tria la frontera amb
  `obrible = n => n.publicat !== false && isUnlocked(n)` (i **no** completats; si
  no n'hi ha, qualsevol `obrible`), agafa el de capa més alta i s'hi mou amb
  `duration(600)` i `scale(1.2)`. El filtre de `publicat` hi és perquè el botó
  no pot portar a un node on no es pot fer res.

### 3.6 Modal

`openModal(id)` → `void`. Omple `#modalId` (`id · familia`), `#modalTitle`,
`#modalDesc`, la secció de fita (amagada si `!es_fita`), l'enllaç
`${DISCOURSE_URL}/t/${discourse_topic_id}` (amagat si `null`) i la llista de
materials:

- `tipus === 'video'`: extreu l'id amb
  `/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/` i incrusta
  `https://www.youtube.com/embed/{id}`. **Si la regex no casa, fa
  `wrapper.innerHTML = m.url`** — és el suport del format antic (§7.3).
- `tipus === 'image'`: extreu l'id de Drive amb `/\/d\/([a-zA-Z0-9_-]+)/` o
  `/[?&]id=([a-zA-Z0-9_-]+)/` i mostra
  `https://drive.google.com/thumbnail?id={id}&sz=w400`, amb
  `onerror="this.style.display='none'"`.
- `tipus === 'mp3'` o `'audio'`: capçalera amb el nom, i després
  **un `<iframe>` de `https://drive.google.com/file/d/{ID}/preview`** dins d'un
  `.audio-wrapper`. Si la URL no és de Drive, cau a un `<audio controls
  preload="none">` natiu. Sempre porta davall un enllaç de reserva.
  **No es pot gastar `<audio>` amb Drive** — vegeu §7.9.
- Altres tipus: enllaç amb icona de `{pdf:'📄', mp3:'🎵', mp4:'🎬', link:'🔗',
  image:'🖼️'}`, per defecte `📎`.

`closeModal()` → **buida l'`innerHTML` de tots els `.video-wrapper` i
`.audio-wrapper`** abans de tancar, i posa en pausa els `.audio-player`. Sense
això el vídeo o la pista continuen sonant amb el modal tancat, i no hi ha manera
de parar-los sense recarregar la pàgina.

`closeModalOutside(e)` → tanca només si `e.target` és l'overlay.

### 3.7 Completar nodes

- `getDescendants(id)` → `Set` d'ids. Recorregut cap avall per `prerequisits`.
  **No té protecció de cicles** (a diferència de `getLayer`); la comprovació
  `result.has()` abans de recórrer el salva en els casos habituals de DAG.
- `toggleComplete()` → si el node estava completat, el desmarca **i desmarca tots
  els descendents**; si no, el marca. Després `saveState()` → `render()` →
  `openModal(id)`.
- `resetNodes()` → `confirm()` i buida tot.

### 3.8 Sincronització amb Discourse

- `getAllAncestors(id, nodeMap)` → array d'ids. Tots els avantpassats.
- `buildBadgeMap(nodes)` → `{ badge_id: [id_fita, ...avantpassats] }`. Només per
  a nodes amb `es_fita && fita.discourse_badge_id`.
- `syncDiscourse()` → `async`. `GET ${PROXY_URL}?username=${input}`, llig
  `data.user_badges[].badge_id`, i per a cada badge que l'usuari té marca com a
  completats el node de la fita i tots els seus avantpassats.
  **La sincronització és només additiva**: mai desmarca res.
  Missatge d'error únic: `Error: usuari no trobat a L'Ardada.` — qualsevol
  fallada (xarxa, proxy caigut, JSON invàlid) dona el mateix text.

### 3.9 Metrònom (Web Audio API)

| Paràmetre | Valor |
| --- | --- |
| Rang BPM | 40–240, per defecte 80 |
| Compàs | `metroBeatCount % 4 === 0` → temps fort (fix, no configurable) |
| Freqüència | 600 Hz fort / 1000 Hz feble |
| Volum | 1.0 fort / 0.7 feble |
| Durada del clic | 0.055 s fort / 0.04 s feble |
| Finestra de planificació | 0.15 s |
| Període del planificador | `setTimeout(..., 50)` ms |
| Primer temps | `currentTime + 0.05` |
| Flaix visual | `classList.remove` als 80 ms |
| Temporitzador | 0 (lliure), 60, 120, 180, 240, 300 s; comprovació cada 250 ms |

`metroSchedule()` és el bucle *look-ahead* clàssic: programa els clics amb
`AudioContext.currentTime` (precís) i el flaix amb `setTimeout` (imprecís, però
només visual).

**L'interval es calcula per temps, dins del bucle `while`, no una vegada per
passada del planificador.** Abans era fora; amb la rampa ha d'estar dins, perquè
cada temps ha de saber a quin compàs pertany. Si algú el torna a traure fora, la
rampa deixarà de funcionar i el símptoma serà que el tempo canvia a salts
estranys, no que peta.

#### Rampa de tempo (pujada progressiva)

| Nom | Valor |
| --- | --- |
| `BPM_MIN`, `BPM_MAX` | 40, 240 |
| `BEATS_PER_COMPAS` | 4 |
| `metroPassos` | 8 (per defecte), 16 o 32 |
| `metroBpmBase` | es congela a `startMetronom()` |
| `metroRampaActiva` | es congela a `startMetronom()`, es posa a `false` a `stopMetronom()` |

- `bpmDelCompas(compas)` → `number`. `base + (base / passos) * min(compas, passos)`,
  arrodonit i limitat a `BPM_MAX`. Del tempo base al **doble** en `passos`
  increments iguals, un per compàs, i es queda al final.
- **La rampa NO escriu mai a la casella de BPM.** Si ho fera, en parar i tornar
  a començar arrancaries des del tempo final i doblaries una altra vegada, i
  cada volta seria pitjor. La casella és el tempo base; el tempo actual es
  mostra a banda, a `#metroBpmActual`.
- `metroBpmBase` es congela en arrancar: tocar la casella amb el metrònom en
  marxa no desquadra la rampa en curs.
- Si `base * 2 > BPM_MAX`, es queda a 240 i el marcador ho diu («· sostre»).

Verificat el 2026-09-17 mesurant els intervals **reals** programats, no el
número de pantalla. Base 80, 8 passos:

```
compàs 1: 750,0 ms  (80 BPM)      compàs 4: 545,5 ms  (110 BPM)
compàs 2: 666,7 ms  (90 BPM)      compàs 5: 500,0 ms  (120 BPM)
compàs 3: 600,0 ms  (100 BPM)
```

Quatre temps a cada tempo i el canvi exactament a la línia de compàs. Amb la
casella desmarcada, tempo constant: cap regressió.

### 3.10 Arrancada i listeners

Listeners no evidents:

- `#metroBpmRange` `input` → copia el valor a `#metroBpmNum`.
- `#metroBpmNum` `input` → clampa a [40, 240] (per defecte 80) i copia al range.
- `window` `resize` → `render()` si hi ha nodes. **Perd el zoom i el
  desplaçament actuals.**
- Els botons de la interfície fan servir `onclick` inline a l'HTML, no
  `addEventListener`. **Renombrar una funció global la trenca en silenci.**

`init()` → `async`. Pinta «Carregant nodes…», `fetch('nodes.json')`,
`buildBadgeMap()`, `render()`. En error pinta
`Error carregant nodes.json: {missatge}` en `#8c4a4a`.
Es crida al final de l'`<script>`, sense esperar `DOMContentLoaded` (funciona
perquè l'script està al final del `<body>`).

---

## 4. `crear_topics.js` — funcions

Mòdul **ESM**, declarat amb `"type": "module"` a `package.json`.
`engines` demana Node ≥ 20.19. Verificat amb **Node v24.14.0**.
633 línies.

Constants del capdamunt: `CSV_PATH` (`./GiT_nodes.csv`), `NODES_PATH`
(`./nodes.json`), `CONFIG_PATH` (`./config.json`), `ARREL` (`GiT_INICI`) i
`TIPUS_MATERIAL` (`video, image, pdf, mp3, mp4, link` — ha de coincidir amb el
que `openModal()` sap pintar).

Scripts d'npm: `validate`, `dry`, `nodes`, `publish`, `serve`.

### 4.1 CSV

- `parseCsv(text)` → `Array<Object>`. Normalitza `\r\n` i `\r` a `\n`, primera
  línia = capçaleres, descarta línies buides.
- `parseCsvRow(line)` → `Array<string>`. Parser manual amb suport de cometes
  dobles i escapament `""`. **No suporta salts de línia dins d'un camp.**
- `serializeCsv(rows, headers)` → `string`. Entrecometa si el valor conté `,`,
  `"` o `\n`. Acaba amb `\n`.

### 4.2 Discourse

- `extractYouTubeUrl(iframeOrUrl)` → `string | null`. Si comença per `http` el
  retorna tal qual; si no, busca `src="([^"]+)"` i n'extrau `/embed/([^?&]+)`.
- `generarCos(row)` → `string` (Markdown del post). Descripció, família,
  etiquetes, prerequisits, materials i, si `es_fita === 'TRUE'`, la secció de
  fita. Peu fix amb l'id del node i l'enllaç a
  `https://elawesomepanda.github.io/dolcaina-skill-tree`.
- `discourseHeaders()` → `{Content-Type, Api-Key, Api-Username}`.
- `crearTopic(row)` → `Promise<number>`. `POST /posts.json` amb
  `{title, raw, category: CONFIG.DISCOURSE_CATEGORY_ID}`. Llança
  `HTTP {status}: {json retallat a 200 chars}`.
- `actualitzarTopic(topicId, row)` → `Promise<void>`. `GET /t/{id}.json` per
  obtindre `post_stream.posts[0].id`, després `PUT /posts/{postId}.json`.

### 4.3 Generació i pujada

- `filelaANode(row)` → node (§2.2), incloent-hi `publicat: esPublicat(row)`.
  *(El nom té una errada: hauria de ser `filaANode`.)*
- `splitComa(s)` → `Array<string>`. Buit si la cadena és buida.
- `esPublicat(row)` → `boolean`. `Boolean(row.id && row.discourse_topic_id)`.
  Decideix si el node ix «en preparació». No confondre amb `valid`.
- `esActiu(row)` → `boolean`. `row.actiu !== 'FALSE'`, o siga que **buit o
  absent = actiu**. Decideix si el node arriba a `nodes.json`. Vegeu §0,
  invariant 3b per a la diferència entre les tres columnes.
- `pushAGitHub(contingut)` → `Promise<void>`. `GET` per obtindre el `sha` actual
  i `PUT /repos/{owner}/{repo}/contents/nodes.json` amb el contingut en base64.
  Missatge de commit: `[auto] Actualitzar nodes.json — {ISO}`.

### 4.4 `main()` i flags de la CLI

| Flag | Efecte |
| --- | --- |
| `--validate` | Només valida el CSV i ix. Codi d'eixida 1 si hi ha errors. |
| `--only-nodes` | Regenera `nodes.json` i **para**. Cap crida a Discourse ni GitHub. |
| `--dry-run` | Imprimeix el pla (actualitzarien / crearien / saltats / no vàlids) i para. |
| `--force-all` | Reenvia **tots** els nodes vàlids ja publicats, ignorant `force_update`. |
| `--skip-validation` | Continua encara que la validació done errors. Eixida d'emergència. |

**La validació s'executa sempre**, en qualsevol mode, abans de tocar res.

Classificació de files (només les que tenen `id`):

```
noValids     = valid !== 'TRUE'                        → ignorats
valids       = valid === 'TRUE'
  pendents   = valids sense discourse_topic_id         → es CREEN
  ambTopicId = valids amb discourse_topic_id
    aActualitzar = forceAll || force_update === 'TRUE' → s'ACTUALITZEN
    saltats      = la resta
```

Ordre d'execució: **validar** → actualitzar → crear → reescriure el CSV (només
si `creats > 0`) → generar `nodes.json` (**de totes les files amb `id`**, amb el
camp `publicat`) → `pushAGitHub()`.

Pausa entre crides a Discourse: **700 ms**
(`await new Promise(r => setTimeout(r, 700))`).

**Aquesta pausa no basta per a lots grans.** Discourse també limita per ràfega:
el 2026-09-24, publicant 33 temes seguits, en va crear 28 i els 5 últims van
caure amb `HTTP 429`. Per això totes les crides passen per `fetchDiscourse()`:

- Si la resposta és **429**, llig `extras.wait_seconds` de la resposta, espera
  eixe temps **més `ESPERA_EXTRA` (2 s)** de marge, i reintenta.
- Fins a `MAX_REINTENTS` (4). Passat això, llança amb el text del servidor.
- **Qualsevol altre codi torna immediatament**: un 422 per títol duplicat no
  s'ha de reintentar mai, perquè no s'arreglarà esperant.

Es fa cas al servidor en lloc d'endevinar el temps d'espera: la xifra ve de
Discourse, que és qui sap quant li queda al comptador.

### 4.6 El full de càlcul

`SHEET_ID` i `SHEET_GID` viuen a **`config.json`**, que no es versiona, i només
els llig `eines/baixar_full.mjs`.

**No són una credencial, però tampoc poden anar al codi.** El full està
compartit en mode lectura per enllaç i el repositori és públic: posar l'id a un
fitxer versionat equival a publicar el full. Si falten a `config.json`, l'script
para amb un missatge que explica d'on traure'ls.

`node eines/baixar_full.mjs <destí>` descarrega i valida abans de guardar. Es
nega a escriure si:

- la petició falla o torna un codi que no és 2xx (amb 401/403 explica que cal
  compartir el full);
- el `Content-Type` no és CSV, o el contingut no comença per
  `id,valid,force_update,`;
- no hi ha cap fila amb `id`.

**El motiu d'aquestes comprovacions:** quan el full és privat, Google no torna
un error net, torna **HTTP 401 amb una pàgina de login en HTML**. Guardar-la tal
qual substituiria el CSV per codi HTML, i l'error apareixeria molt més tard i
molt més confús.

La connexió és **només de lectura**. En publicar nodes nous, `main()` escriu
`ids_nous.csv` (`id,discourse_topic_id`) perquè es puguen enganxar en bloc al
full: el CSV local sí que queda actualitzat, però el full no se'n entera.
**Si no s'enganxen, la pròxima importació els portarà buits i l'script tornarà a
crear els temes, duplicats.**

### 4.7 `eines/insignies.mjs`

`node eines/insignies.mjs [csv]` → consulta `GET {DISCOURSE_BASE_URL}/badges.json`
(**públic, no gasta l'API key**) i el creua amb les files `es_fita=TRUE`.
Cinc seccions de sortida:

| Secció | Quan ix |
| --- | --- |
| Fites resoltes | `discourse_badge_id` buit però el `discourse_badge_name` casa amb el fòrum → et dona l'id |
| Fites sense insígnia al fòrum | El nom no casa. Si n'hi ha una de pareguda (Levenshtein) la suggereix |
| Ids que no existeixen | `discourse_badge_id` apunta a una insígnia inexistent |
| Noms que no quadren | L'id existeix però el nom del full és un altre. Informatiu: **mana l'id** |
| Insígnies que no gasta cap node | Les del fòrum que sobren |

Escriu `badges_nous.csv` (`id,discourse_badge_id`) amb les resoltes, per a
enganxar-les al full en bloc.

**`PREFIX_BADGE = 'GiT_'`** decideix quines insígnies del fòrum es consideren del
projecte. No es pot filtrar per id: Discourse en porta de pròpies amb ids alts
(`Daydreamer` 115, `Brainstormer` 116, `Innovator` 117, `Visionary` 118). Una
insígnia de l'arbre que no seguisca el prefix no eixirà a la llista de sobrants.

Les fites que s'acaben de resoldre s'afigen a `idsEnUs` abans de calcular els
sobrants: si no, l'insígnia que t'acaba de dir que enganxes eixiria alhora com a
«no la gasta ningú».

### 4.8 `eines/comparar_csv.mjs`

`node eines/comparar_csv.mjs <csv_actual> <csv_nou>` → imprimeix el resum de
canvis i ix amb 0. Parser copiat de `crear_topics.js`: **si allà canvia, ací
també**. Compara les capçaleres (i avisa si no casen, senyal que s'ha exportat
el full equivocat), i després ids afegits, llevats —marcant els que estaven
publicats— i cel·les modificades, agrupades per columna i retallades a 6 per
columna perquè la taula no es desmadre.

### 4.5 El validador

`validar(rows)` → `Array<{ nivell, text, suggeriment }>`, amb `nivell` igual a
`'error'` (para l'execució) o `'avis'` (informa i continua). **Cada problema
porta un suggeriment concret en termes del CSV**, no del codi.

| Comprovació | Nivell | Suggeriment que dona |
| --- | --- | --- |
| id duplicat | error | Quina fila renombrar; avisa que la segona s'ignora sencera |
| prerequisit inexistent | error | L'id existent més paregut («volies dir X?») o crear el node |
| node publicat que depén d'un en preparació | avís | Publicar el prerequisit o despublicar el node |
| arrel inesperada (sense prerequisits i no és `ARREL`) | avís | Omplir la cel·la de prerequisits |
| `es_fita=TRUE` sense `fita_nom` | error | Omplir-lo o posar `es_fita=FALSE` |
| `es_fita=TRUE` sense `discourse_badge_id` | error | Crear la insígnia a `/admin/badges` |
| `matN_tipus` desconegut | error | El tipus més paregut, i la llista d'admesos |
| `matN_tipus` sense URL | error | Omplir la URL o buidar el tipus |
| `matN` sense nom | avís | Omplir el nom: al fòrum, buit ix com a «****» |
| node actiu que depén d'un d'amagat | error | Activar el prerequisit o amagar també el node |
| `ARREL` amagat | error | L'arbre es quedaria sense punt de partida |
| cicle de prerequisits | error | Quina aresta exacta llevar per a trencar-lo |
| nodes publicats inassolibles | avís | El progrés màxim assolible, en % |

Funcions de suport:

- `distancia(a, b)` → `number`. Levenshtein, matriu d'una fila. Per a 73 nodes va
  de sobra.
- `idMesParegut(id, candidats)` → `string | null`. Accepta una distància de fins
  a `max(2, floor(id.length / 3))`; per damunt, retorna `null` i no suggereix res.
- `detectarCicles(files, perId)` → `Array<Array<string>>`. DFS de tres colors.
  Retorna el **camí sencer** del cicle (`A → B → A`), no només que n'hi ha un.
- `nodesInassolibles(files, perId)` → `{ assolibles, publicats, inassolibles }`.
  **Reprodueix `isUnlocked()` d'`index.html`**: propaga en punt fix quins nodes
  publicats es poden arribar a completar. Si canvia la regla de desbloqueig a
  `index.html`, aquesta funció s'ha de canviar igual o mentirà.
- `informarValidacio(problemes, rows)` → `boolean`. Imprimeix avisos i després
  errors, cada problema amb la seua línia `→ suggeriment`. Retorna si es pot
  continuar. Acaba sempre amb el recompte
  `CSV: N nodes (P publicats, Q en preparació).`

---

## 5. Flux de treball complet

```
Google Sheets  ──exporta──►  GiT_nodes.csv
                                  │
                  npm run validate                 (0 errors?)
                                  │
                  npm run dry                      (revisar el pla)
                                  │
                  npm run publish
                    ├─► Discourse: crea/actualitza topics
                    ├─► reescriu GiT_nodes.csv amb els topic_id nous
                    ├─► genera nodes.json
                    └─► PUT a GitHub Contents API (commit automàtic)
                                  │
                          GitHub Pages (~1 min)
                                  │
           https://elawesomepanda.github.io/dolcaina-skill-tree
```

Els badges es creen **a mà** a l'administració de Discourse; el seu `id` s'apunta
manualment a la columna `discourse_badge_id` del CSV.

---

## 6. Taula de diagnòstic

| Símptoma | Causa probable | On mirar |
| --- | --- | --- |
| «Error carregant nodes.json» a la pantalla | `fetch` de fitxer local amb `file://` (CORS), o `nodes.json` malformat | `init()`, línia ~1298. Cal servidor: `npx serve .` |
| L'arbre ix buit o amb un sol node | `nodes.json` amb 0 files, o `NODES` no és array | consola: `NODES.length` |
| Un node no es pot clicar | Té prerequisits no completats | `isUnlocked()`, línia 742 |
| Un node surt «en preparació» | No té `discourse_topic_id`: encara no s'ha publicat al fòrum | §0, invariant 3b |
| El progrés no arriba mai al 100 % | Hi ha nodes publicats inassolibles | `npm run validate` t'ho diu i et dona el màxim |
| `ENOENT ./GiT_nodes.csv` | El CSV real no es versiona: en una clonació nova no hi és | Copia'l del disc de l'autor, o parteix de `GiT_nodes.exemple.csv` |
| `HTTP 429` en publicar | Límit de ràfega de Discourse | Es reintenta sol. Si es rendeix, torna a executar: els creats ja tenen id i se salten |
| `HTTP 422: This title has already been used` | El node ja té tema però el CSV no en sap l'id | §7.11. Enganxa l'id al full; NO el crees una altra vegada |
| `npm run publish` es nega a executar-se | La validació ha trobat errors | Llig els suggeriments; força'l amb `--skip-validation` si cal |
| El vídeo continua sonant en tancar el modal | `closeModal()` no ha buidat el `.video-wrapper` | línia 1069 |
| La imatge de Drive no es veu | Fitxer no compartit públicament, o la regex de l'id no ha casat | línia 1039 |
| «Error: usuari no trobat a L'Ardada» sempre | El Worker del proxy està caigut o ha canviat d'URL — el missatge és genèric | `syncDiscourse()`, línia 1155; comprova `PROXY_URL` amb `curl` |
| Un badge sincronitzat no desbloqueja res | `discourse_badge_id` buit al CSV, o `es_fita=FALSE` | `buildBadgeMap()`, línia 1135 |
| `Cannot use import statement outside a module` | Node < 20.19, o falta `package.json` | §4 |
| El zoom es reinicia sol | S'ha redimensionat la finestra o s'ha cridat `render()` | listener `resize`, línia 1282 |
| Els temps del metrònom «ballen» visualment | El flaix va per `setTimeout`, no per `AudioContext` | `metroSchedule()`, línia 1211 |

---

## 7. Trampes conegudes

### 7.1 API key de Discourse filtrada al repositori públic

`originaldesign.md` està **versionat** i contenia, a la secció de referències
(línia 260), una clau d'API de Discourse en text pla (`1d642583…54e6`).

El repositori és públic (`https://github.com/ElAwesomePanda/dolcaina-skill-tree`).

- **2026-09-10**: la clau s'ha llevat del fitxer al disc, però **continua a
  l'historial de Git** des del commit `54db34d`. Esborrar-la del fitxer **no és
  suficient**: cal **revocar-la** a `/admin/api/keys`.
- **No reproduïsques la clau sencera en cap fitxer nou** (documentació inclosa).
  Per a referir-t'hi, gasta el prefix i prou.
- `config.json` (que en té una altra, diferent, i a més un PAT de GitHub) sí que
  està al `.gitignore` i **no** apareix a `git ls-files`.

### 7.2 Cicles de prerequisits

Hi va haver un desbordament de pila a `getLayer()` per prerequisits circulars
(commits `615b2a3` i `f1f54c6`, nodes `PERC_DDEE` i `PERC_DEDx`). La solució és
la bandera `n._computing`, que **no elimina el cicle: el talla i posa el node a
la capa 0**. Un cicle nou es manifestarà com un node dibuixat en un lloc absurd,
no com una excepció. `getDescendants()` **no** té aquesta protecció.

### 7.3 El format antic de vídeo era un `<iframe>` sencer

Algunes cel·les `matN_url` contenien l'HTML complet de la incrustació de YouTube
en lloc de la URL. Per això `openModal()` fa `wrapper.innerHTML = m.url` quan la
regex falla, i `extractYouTubeUrl()` busca `src="..."`. És injecció d'HTML
deliberada sobre dades pròpies. Vegeu el commit `43d86aa`.

### 7.4 Restes de Google Apps Script

`.clasp.json`, `.claspignore`, `appsscript.json` i `config.gs` són d'una versió
anterior del pipeline que corria a Apps Script. **No formen part del flux actual**
i estan tots al `.gitignore`. `config.gs` només té valors de farciment
(`ghp_XXXXXXXXXXXXXXXXXX`).

### 7.5 El proxy, i per què ja no caldria

`PROXY_URL` apunta a un Cloudflare Worker
(`dolcaina-discourse-proxy.guillem-reig-m.workers.dev`). El codi i la
documentació de recreació estan a **`proxy/`**.

Comprovat el 2026-09-11: **Discourse ja envia els capçaleres CORS correctes**
(`Access-Control-Allow-Origin: https://elawesomepanda.github.io`, tiquet
Communiteq #825876), o siga que el Worker es podria llevar. **Decisió presa: no
es toca.** Funciona, i canviar-ho seria arreglar preventivament una cosa que no
està trencada. El que s'ha de fer si algun dia falla està escrit a
`proxy/README.md` §4.

El Worker desplegat té una travessa de camins (`?username=../../about` torna
`/about.json`): és un proxy obert cap a contingut **públic** de Discourse. Sense
API key pel mig, la gravetat és baixa. Documentat a `proxy/README.md` §3.

---

### 7.6 `menu.ps1` ha d'anar en UTF-8 **amb BOM**

PowerShell 5.1 (el que porta Windows de sèrie) llig els `.ps1` sense BOM com a
ANSI. Tots els accents es destrossen i el resultat no és un fitxer lleig: és un
fitxer que **no compila**, amb un error que no assenyala el problema:

```
linia 135: Falta la llave de cierre "}" en el bloque de instrucciones
linia 140: Falta la cadena en el terminador: '.
```

Les línies 135 i 140 estaven perfectament bé. El que passava és que uns bytes
mal descodificats més amunt havien obert una cadena que no es tancava mai.

Si edites `eines/menu.ps1` amb una eina que lleve el BOM, torna-li'l a posar.

### 7.7 `2>&1` sobre un executable natiu en PowerShell 5.1

A `Informe`, la sortida de `node` es recull amb `cmd /c '... 2>&1'` en lloc de
fer la redirecció des de PowerShell. No és caprici:

- PowerShell 5.1 embolcalla **cada línia de stderr** d'un programa natiu en un
  `ErrorRecord` (`NativeCommandError`).
- Amb `$ErrorActionPreference = 'Stop'` al capdamunt del fitxer, això es torna
  un error terminant i la funció peta, encara que `node` haja acabat amb 0.
- I si es converteix a text, cada línia dona
  `System.Management.Automation.RemoteException` en lloc del missatge.

Deixant que `cmd` ajunte els fluxos, PowerShell rep text pla i s'acaben els
dos problemes alhora.

### 7.8 `Node-Exec` necessita `Out-Host`

```powershell
& node 'crear_topics.js' @flags | Out-Host
return $global:LASTEXITCODE
```

Sense l'`Out-Host`, la sortida estàndard de Node se'n va a la canonada i acaba
**dins de la variable que havia de recollir el codi d'eixida**. `$codi` passa a
ser un array, `$codi -eq 0` és fals, i el menú diu «Hi ha errors» quan no n'hi
ha cap. A més, la línia de resum de Node desapareix de la pantalla.

---

### 7.8b Un `git rebase` va esborrar el CSV de treball (2026-09-11)

En reorganitzar el commit que **deixava de versionar** `GiT_Nodes.csv`, Git va
esborrar el fitxer del disc. Però al disc es diu `GiT_nodes.csv` (ena
minúscula), i com que Windows no distingeix majúscules, **va esborrar les dades
de treball de veritat**. Sense avís i sense error.

Es va recuperar tornant a baixar el full (opció 1 del menú), que a més estava
més al dia que el fitxer perdut. Les còpies de `copies/` també ho haurien
salvat.

No es pot repetir amb aquest fitxer, perquè ja no està versionat. **Sí que pot
repetir-se** en qualsevol operació que mou l'arbre de treball a un commit
anterior a aquell (`git checkout <commit vell>`, `git stash`, un rebase més
llarg): allà `GiT_Nodes.csv` encara existia.

Abans de qualsevol operació d'eixes: **baixa el full després**, o comprova que
`GiT_nodes.csv` continua al seu lloc. `npm run validate` t'ho diu de seguida amb
`ENOENT: no such file or directory, open './GiT_nodes.csv'`.

### 7.9 Google Drive no serveix com a font d'`<audio>`

Provat el **2026-09-11** amb les quatre variants d'URL:

| URL | Resultat a `<audio>` |
| --- | --- |
| `drive.google.com/uc?export=download&id=` | `MEDIA_ERR_SRC_NOT_SUPPORTED` (codi 4) |
| `drive.usercontent.google.com/download?id=` | codi 4 |
| `drive.google.com/uc?export=view&id=` | codi 4 |
| `drive.usercontent.google.com/uc?id=` | codi 4 |

**I amb `curl` sí que es baixa el fitxer**, amb `Content-Type: audio/mpeg` i
`Access-Control-Allow-Origin: *`. Açò és el que enganya: comprovar-ho amb `curl`
**no demostra res** sobre si el navegador podrà reproduir-ho. Drive mira les
capçaleres d'una petició de mitjà (`Sec-Fetch-Dest: audio`) i la talla.

Prova de control feta al mateix navegador per a descartar que fora cosa de
l'entorn: un `.ogg` de Wikimedia carrega sense problema al mateix element
`<audio>`. L'element funciona; el que no serveix és Drive.

La solució és l'`<iframe>` de `/preview`, que és el reproductor de Google
mateix. Si algun dia es volen controls propis, els fitxers han de canviar de
lloc (vegeu `BACKLOG.md`).

---

### 7.10 La comprovació de `baixar_full.mjs` no pot mirar l'ordre

La primera versió exigia que el CSV començara literalment per
`id,valid,force_update,`. En afegir la columna `actiu` en segona posició
(2026-09-11), la descàrrega es va bloquejar:

```
El que ha arribat no és el CSV que esperàvem.
Content-Type: text/csv
Comença per:  id,actiu,valid,force_update,familia,tags,titol,...
```

El guardià feia la seua faena (no va tocar el CSV bo), però per un motiu fals.
Ara comprova que **hi siguen** les columnes de `COLUMNES_ESSENCIALS`
(`id`, `titol`, `prerequisits`, `discourse_topic_id`), sense mirar l'ordre ni
exigir la llista sencera. El full pot guanyar columnes sense trencar res.

---

### 7.11 L'opció 8 va importar un CSV de fa 13 dies (2026-09-24)

L'opció 8 del menú agafa el `GiT_nodes*.csv` **més recent de Baixades**. Com que
feia setmanes que s'importava directament del full (opció 1), el més recent
d'allí era `GiT_nodes_20260911_06.csv`: 21 columnes (sense `actiu`), 87 nodes i
els 14 d'ERM encara sense `discourse_topic_id`.

En publicar amb eixes dades, l'script va creure que els 14 nodes d'ERM no
existien i **va intentar crear-los una segona vegada**:

```
✗ PERC_ERM_BEAT_01: HTTP 422: {"errors":["This title has already been used by
  another topic."]}
```

**Els 14 van fallar i no es va crear cap duplicat, però el mèrit va ser de
Discourse, no nostre**: rebutja títols repetits dins de la mateixa categoria.
Si els títols hagueren sigut lleugerament diferents, hauria funcionat i el
fòrum hauria acabat amb 14 temes bessons.

La mateixa execució va regenerar `nodes.json` amb les dades velles i el va pujar
a GitHub, deixant tota la branca d'ERM com a «en preparació» en producció fins
que l'autor va reexecutar el procés correcte.

Guardes afegides el mateix dia:

1. `comparar_csv.mjs` reporta en un bloc propi qualsevol
   `discourse_topic_id` que passe de tindre valor a estar buit, i qualsevol node
   publicat que desaparega. **Ix amb codi 3.**
2. Amb eixe codi 3, el menú no accepta el `s/N` de sempre: cal escriure
   `PERDRE TEMES` sencer.
3. L'opció 8 diu l'antiguitat del fitxer i recomana l'opció 1 si té més d'un dia.
4. `comparar_csv.mjs` avisa si canvia el nombre de columnes.

Provat reproduint l'escenari exacte: buidant els 14 `discourse_topic_id` d'ERM,
la comparació els llista tots amb el número de tema que perdria cadascun.

**El consell de l'avís depén d'on vinga el CSV** (`$font` a `Aplicar-Import`),
perquè la causa probable és molt diferent:

| Origen | Causa habitual | Què diu |
| --- | --- | --- |
| Opció 1 (full) | Un `discourse_topic_id` no es va enganxar al full en publicar | Que mire `ids_nous.csv`, i li n'ensenya el contingut |
| Opció 8 (Baixades) | El fitxer és més vell que les dades | Que gaste l'opció 1 |

La primera versió deia sempre «importa del full (opció 1)», que no té cap
sentit quan ja véns del full. Va passar el 2026-09-24 amb
`PERC_DIM_SENCERA_01`: el tema 1387 estava al CSV local i a `ids_nous.csv`,
però mai es va arribar a enganxar al full.

---

## 8. «Sembla un bug, però és deliberat»

- **Desmarcar un node desmarca tots els seus descendents.** És coherent amb el
  model d'arbre de fites: no pots tindre una fita avançada si has perdut la base.
- **`syncDiscourse()` no desmarca mai res.** El progrés local és sobirà; Discourse
  només pot afegir. Evita que un problema del proxy esborre el treball de l'alumne.
- **`badgeSVG()` no es crida.** Es va substituir per l'emoji de `fita.icona`.
  És codi mort, però es conserva perquè és la base de la idea de «tiers visuals».
- **L'arbre creix cap amunt (y negatiu).** Decisió del disseny original: arrels
  a baix, fulles a dalt.
- **Els nodes sense publicar es dibuixen, en estat «en preparació».** Permet
  veure l'itinerari que ve, i sobretot fa **visible** per què un node publicat
  està bloquejat: si el seu prerequisit encara no s'ha publicat, l'alumne veu el
  forat en lloc de trobar-se un mur sense explicació.
- **Un node «en preparació» no es pot obrir.** Ni modal ni res. Vegeu
  `MILLORES.md` M-06 si algun dia es vol un modal de només lectura.
- **El validador avisa dels nodes inassolibles però no ho tracta com a error.**
  És un estat temporal i legítim mentre es prepara contingut, i ara és visible a
  la pantalla. Bloquejar-ho pararia el treball del dia a dia sense necessitat.
- **`<meta name="robots" content="noindex, nofollow">`.** L'arbre és públic però
  no indexable a propòsit.
- **`overflow: hidden` al `body`.** Tot el desplaçament el gestiona `d3.zoom()`.

---

## 9. Deute conegut i estat verificat

### Verificat el 2026-09-11 (executat, no llegit)

**Pipeline:**

- `npm run validate` sobre el CSV real: 0 errors, 2 avisos (el cas de Lat. 009 i
  els 6 nodes inassolibles). Codi d'eixida 0.
- El validador provat contra un CSV trencat a posta: detecta i suggereix
  arreglament per a id duplicat, prerequisit mal escrit (`PERC_PL1` →
  suggereix `PERC_PL_1`), fita sense nom, fita sense badge, tipus de material
  mal escrit (`vidoe` → suggereix `video`), material sense URL i cicle
  (`A → B → A`, amb l'aresta a trencar). Codi d'eixida 1.
- `npm run nodes` genera 73 nodes: 40 publicats, 33 en preparació.
- `GiT_nodes.exemple.csv` valida net (0 errors, 0 avisos).

**Interfície, servida amb `npx serve` i comprovada al navegador:**

- Carrega els 73 nodes i els pinta: 33 targetes amb `.preparacio`, cap amb
  cadenat, totes amb `cursor: default` i el text `En preparació`.
- Arrel única `GiT_INICI`, 7 fites.
- `getCompletionPct()`: amb 4 nodes publicats i 1 id fantasma al `Set`, dona
  10 %, no 12 %.
- Progrés màxim assolible calculat a la pàgina: **85 % (34 de 40)**, el mateix
  número que reporta el validador. Les dues implementacions coincideixen.

**Xarxa:**

- `PROXY_URL` respon `HTTP 200` amb `{badges, badge_types, granted_bies,
  user_badges}` — la forma que espera `syncDiscourse()`.
- L'usuari `greig` té 15 insígnies; dues casen amb l'arbre: `112` (`GiT_INICI`)
  i `108` (`PERC_PL_4`).
- Discourse envia CORS directe per a l'origin de GitHub Pages (§7.5).
- La clau d'API filtrada ja no apareix a `/admin/api/keys`: està revocada.

### **No** verificat

- **El flux complet de badges de punta a punta**: ningú ha completat una branca
  i reclamat la insígnia de veritat. El botó «Sincronitzar fites» no s'ha premut
  mai amb un usuari real des de la pàgina.
- No s'ha fet cap crida real d'escriptura a Discourse ni a GitHub en aquesta
  revisió (només `--dry-run` i `--only-nodes`).
- El metrònom **no s'ha provat**, ni en escriptori ni en mòbil.
- El modal **no s'ha obert** en aquesta revisió: ni vídeo, ni imatge de Drive,
  ni el botó de completar.
- Només s'ha provat en el navegador de la vista prèvia. Ni Firefox, ni Safari,
  ni cap mòbil real.
- No hi ha cap prova automatitzada al projecte.

### Deute

- Zero `@media` al CSS: **no hi ha cap adaptació a mòbil**.
- Zero atributs `aria-*` o `tabindex`: l'arbre no és navegable per teclat ni
  utilitzable amb lector de pantalla.
- `familia` i `tags` es guarden però no serveixen per a res a la interfície.
- `badgeSVG()` continua sent codi mort (§8).
- `render()` continua reiniciant el zoom (§0, invariant 7).
- `getDescendants()` continua sense protecció de cicles.
- `syncDiscourse()` no passa el `username` per `encodeURIComponent`.
- Màxim de 2 materials per node, imposat per l'esquema del CSV.
- El CSV real té 927 files buides d'una exportació de Google Sheets.
- No hi ha branca de dolçaina ni de flabiol: 72 de 73 nodes són de percussió.
