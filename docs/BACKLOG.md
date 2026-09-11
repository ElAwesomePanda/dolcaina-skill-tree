# BACKLOG.md — Pendents

Checklist lliure, incloses les coses xicotetes. Es pot tocar sense confirmació.
Les entrades grans viuen a `MILLORES.md` amb codi `M-nn`; ací hi ha el detall
operatiu i tot el que és massa menut per a tindre fitxa pròpia.

---

## Urgent

- [x] **Revocar** la clau de Discourse d'`originaldesign.md` (`1d642583…54e6`) —
      **fet abans del 2026-09-10**, verificat a `/admin/api/keys`: ja no hi és
- [x] Llevar la clau del text d'`originaldesign.md` — 2026-09-10
- [x] **Lat. 009 arreglat** — 2026-09-11: `PERC_LAT_11_21_41_1` passa a penjar
      de `PERC_LAT_11_12_11_21_4` (Lat. 003 · 4 min). Cap node inassolible
- [ ] Crear la insígnia de `PERC_ERM_REDOBLE_02` («La revelació!») i apuntar-ne
      l'id **abans** de publicar la branca ERM
- [ ] ~~**Arreglar Lat. 009.**~~ `PERC_LAT_11_21_41_1` (Lat. 010, publicat) depén de
      `PERC_LAT_11_12_14_1` (Lat. 009, sense publicar). Això deixa **6 nodes
      impossibles de desbloquejar** i el progrés màxim en **85 %**. Publica
      Lat. 009 o despublica Lat. 010 i 011. `npm run validate` ho reporta com a
      avís (no bloqueja: ara es veu a la pantalla com a «en preparació»)
- [ ] Restringir l'àmbit de la clau `a0ae…` de `Global` a `posts#create`,
      `posts#update`, `topics#show`
- [ ] Comprovar l'àmbit i la caducitat del PAT de GitHub de `config.json`

## Higiene del repositori

- [ ] Decidir què fer amb els fitxers amb canvis sense confirmar
- [x] Unificar `GiT_nodes.csv` / `GiT_Nodes.csv` — 2026-09-10: el real passa a
      estar al `.gitignore`, es versiona `GiT_nodes.exemple.csv`, i la ruta és
      la constant `CSV_PATH` — `M-15`
- [x] Crear `package.json` (`"type": "module"`, `engines`, scripts) — `M-16`
- [ ] Netejar les **927 files buides** del final de `GiT_nodes.csv`
- [ ] Afegir `.gitattributes` amb `* text=auto` (Git ja avisa de LF/CRLF a
      `nodes.json`)
- [ ] Decidir si esborrar les restes d'Apps Script (`.clasp.json`,
      `.claspignore`, `appsscript.json`, `config.gs`)
- [ ] Afegir un `README.md` a l'arrel (ara no n'hi ha cap)
- [ ] Crear `config.exemple.json` amb les claus buides, versionat, perquè es
      puga muntar l'entorn sense endevinar l'esquema

## Codi — `index.html`

- [ ] Conservar el transform de zoom entre `render()` — `M-05`
- [ ] `Escape` per a tancar el modal
- [ ] `aria-label` als botons de zoom (`+`, `−`, `⌂`) — `M-08`
- [ ] `role="button"` i `tabindex` a les targetes desbloquejades — `M-08`
- [ ] `@media` per a mòbil — `M-04`
- [ ] Missatges d'error diferenciats a `syncDiscourse()` (ara tot dona
      «usuari no trobat»)
- [ ] Indicador de càrrega al botó «Sincronitzar fites» mentre espera el proxy
- [ ] Decidir sobre `badgeSVG()`: fer-la servir o esborrar-la — `M-09`
- [x] `getCompletionPct()` compta sobre els nodes publicats i ignora els ids
      d'esborranys que puguen quedar al `localStorage` — 2026-09-10 — `M-06`
- [x] Quart estat visual «En preparació» per als nodes sense publicar: vora
      discontínua, sense cadenat, no clicable, fora del progrés — 2026-09-11 — `M-06`
- [x] Baixar el pes visual dels «en preparació»: cridaven més l'atenció que els
      desbloquejables — 2026-09-11
- [x] `jumpToLastUnlocked()` no porta mai a un node en preparació — 2026-09-11
- [ ] `getDescendants()` no té protecció de cicles (`getLayer()` sí que en té)
- [x] Reproductor d'àudio per a material `mp3`, amb l'iframe de Drive —
      2026-09-11 — `M-12`
- [ ] Els mp3 no es poden reproduir amb `<audio>` natiu perquè viuen a Drive
      (`DESIGN.md` §7.9). Si algun dia es volen controls propis o que sonen al
      fòrum, cal moure'ls: al repositori (GitHub Pages) o pujar-los a Discourse
- [ ] Mostrar els `tags` a la targeta del node (ara es carreguen i no s'usen)
- [ ] Colorejar la vora de la targeta per `familia` (útil quan hi haja dolçaina)
- [ ] Fixar la versió de D3 amb `integrity` (SRI) a l'etiqueta `<script>`

## Codi — `crear_topics.js`

- [x] Flag `--validate` — 2026-09-10 — `M-14`
- [x] La ruta del CSV extreta a la constant `CSV_PATH` — 2026-09-10
- [x] `nodes.json` porta tots els nodes amb el camp `publicat` — 2026-09-11
- [x] El validador suggereix arreglaments concrets per a cada problema, amb
      coincidència aproximada d'ids i tipus (Levenshtein) — 2026-09-11
- [x] El validador calcula els nodes publicats inassolibles i el progrés
      màxim — 2026-09-11
- [ ] Corregir l'errada del nom `filelaANode` → `filaANode`
- [ ] `parseCsvRow()` no admet salts de línia dins d'un camp entrecometat
- [ ] Suportar més de 2 materials per node (ara l'esquema del CSV en fixa 2)
- [ ] Que `--only-nodes` també valide, no només genere

## Metrònom

- [ ] Botó «Practicar» al modal amb el temporitzador posat als minuts del node — `M-10`
- [ ] Compàs configurable (ara `% 4` fix)
- [ ] Mode de pujada progressiva de BPM
- [ ] Comprovar que l'`AudioContext` es reprén bé en iOS després de bloquejar la pantalla

## Contingut

- [ ] Definir les fites de la branca de **dolçaina** — `M-11`
- [ ] Afegir material `pdf` (partitures) — `M-12`
- [ ] Afegir material `mp3` (pistes d'acompanyament) amb reproductor incrustat — `M-12`
- [ ] Publicar o eliminar els 36 nodes `valid=FALSE`
- [ ] Reenviar a Discourse els 15 nodes amb `force_update=TRUE`
- [ ] `GiT_INICI` no té cap material: afegir-hi una benvinguda en vídeo

## Eines

- [x] Connexió directa amb el full de càlcul en lectura (`eines/baixar_full.mjs`,
      opció 1 del menú) — 2026-09-11
- [x] Rotació de còpies de seguretat: se'n guarden les 3 últimes — 2026-09-11
- [x] `ids_nous.csv` en publicar, per a enganxar els topic_id al full en bloc — 2026-09-11
- [x] Opció 9: creuar les fites amb les insígnies del fòrum i resoldre'n els ids
      pel nom (`eines/insignies.mjs`) — 2026-09-11
- [ ] La insígnia `GiT_Beat_I_Complet` (id 107) no la gasta cap node: mirar si
      sobra o si li falta el node
- [ ] **Refactoritzar: moure les dades a una carpeta `dades/`** (`GiT_nodes.csv`,
      `nodes.json`, `GiT_nodes.exemple.csv`, `ids_nous.csv`). Ara estan totes a
      l'arrel barrejades amb el codi. Afecta `CSV_PATH`, `NODES_PATH`,
      `IDS_PATH`, el `fetch('nodes.json')` d'`index.html`, el `.gitignore` i el
      menú
- [ ] Escriptura al full amb l'API de Sheets, per a no haver d'enganxar els ids
      a mà — `M-13`
- [x] `arbre.bat` + `eines/menu.ps1`: menú de doble clic — 2026-09-11
- [x] Importació del CSV des de Baixades amb còpia de seguretat i resum de
      canvis (`eines/comparar_csv.mjs`) — 2026-09-11
- [x] Informe d'incidències guardat a `copies/informes/` — 2026-09-11
- [x] La insígnia que falta és avís si el node és esborrany, error si està
      publicat — 2026-09-11
- [ ] El filtre `GiT_nodes*.csv` de Baixades també casa amb
      `GiT_Nodes - nodes_template_1.csv`. Ara no molesta perquè és vell, però si
      algun dia es toca passarà a ser el «més recent»
- [ ] L'opció 4 deixa el servidor en una finestra a banda: no es para des del menú

## Infraestructura

- [x] Versionar el codi del Cloudflare Worker a `proxy/` — 2026-09-10 — `M-03`
- [ ] ~~Restringir l'`Origin` i validar el `username` al Worker~~ — **descartat
      el 2026-09-10**: el Worker no es tocarà. Si algun dia es torna a
      desplegar, els arreglaments estan a `proxy/README.md` §3
- [ ] `encodeURIComponent(input)` al `username` de `syncDiscourse()`: ara un nom
      amb `&` o `#` trenca la petició (independent del Worker)
- [ ] *Hook* de `pre-commit` contra secrets — `M-02`
- [ ] Llegir el full de càlcul directament, sense exportació manual — `M-13`

## Verificació

- [x] Repàs al navegador i apuntat a `DESIGN.md` §9 — 2026-09-11. **Falta encara**
      provar el modal, el metrònom i el flux de badges — `M-19`
- [x] Comprovar que `PROXY_URL` respon — 2026-09-10, `HTTP 200`
- [x] Comprovar que Discourse ja envia CORS directe (tiquet #825876) —
      2026-09-10: sí, `Access-Control-Allow-Origin: https://elawesomepanda.github.io`
- [ ] Provar en Firefox i en Safari (`foreignObject` sol donar sorpreses)
- [ ] Prova de punta a punta amb un alumne real — `M-20`
- [ ] Provar la publicació de veritat (branca ERM, 14 temes) — **en curs
      2026-09-11**

## Documentació

- [x] `docs/DESIGN.md` — 2026-09-10, actualitzat el 2026-09-11 amb la fase 1
- [x] `docs/CLAUDE.md` — 2026-09-10
- [x] `docs/ROADMAP.md` — 2026-09-10
- [x] `docs/BACKLOG.md` — 2026-09-10
- [x] `docs/MILLORES.md` — 2026-09-10
- [x] `docs/USERGUIDE.md` — reescrit el 2026-09-11: Part B verificada pas a pas,
      menú, insígnies, els dos fitxers per a enganxar, i taula de problemes
- [ ] `USERGUIDE.md`: falten **captures de pantalla**
- [ ] `USERGUIDE.md` Part A: **no l'ha llegida cap alumne**. Provar-la amb algú
      de fora abans de donar-la per bona
- [ ] Repassar `DESIGN.md` contra el codi després de cada fase del `ROADMAP.md`

## Idees soltes, sense compromís

- [ ] Exportar el progrés a un fitxer per a canviar de dispositiu sense compte
- [ ] Vista de llista com a alternativa a l'arbre (accessibilitat i mòbil)
- [ ] Animació en desbloquejar un node
- [ ] So en completar una fita
- [ ] Compartir una fita aconseguida com a imatge
- [ ] Mode «professor» que mostre tots els nodes desbloquejats sense tocar el progrés
