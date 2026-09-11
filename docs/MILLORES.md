# MILLORES.md — Propostes per a acabar i millorar el projecte

> Revisió del **2026-09-10** sobre l'estat del repositori en aquell moment
> (73 nodes, 4 fitxers amb canvis sense confirmar).
> Cada proposta porta **esforç** (S/M/L), **impacte** i **risc**.
> Res d'açò s'ha implementat: és material per a decidir.

**Res d'aquest document s'ha implementat.** És una llista per a triar.

---

## Resum executiu

L'aplicació funciona i el pipeline de dades és sòlid. El que falta és, per ordre:

1. **Una fuita de credencials que cal tapar hui** (M-01).
2. **Contingut**: el projecte es diu «Dolçaina i Tabalet» i el 99 % dels nodes
   són de percussió. No hi ha ni una branca de dolçaina (M-11).
3. **Mòbil**: no hi ha ni una `@media`. Els alumnes gastaran el mòbil (M-04).
4. **Fricció de manteniment**: dependre d'un CSV exportat a mà i d'un Worker
   sense codi font són els dos punts que faran que el projecte s'encalle (M-13,
   M-14).

---

## A. Seguretat — fer-ho abans que res

### M-01 · Revocar la clau de Discourse filtrada · S · impacte alt · risc alt si no es fa

`originaldesign.md` està versionat en un repositori públic i porta una API key de
Discourse en text pla (§7.1 de `DESIGN.md`). Amb `Scope: Global` i
`User Level: Single User` sobre un compte administrador, qui la trobe pot
escriure, esborrar i llegir missatges privats a L'Ardada.

Passos, en aquest ordre:

1. **Revocar la clau** a `https://ardada.discoursehosting.net/admin/api/keys`.
   Açò és el que compta; la resta és neteja.
2. Crear-ne una de nova amb *scope* restringit (només `posts#create`,
   `posts#update`, `topics#show`) i posar-la a `config.json`.
3. Llevar la clau del text d'`originaldesign.md` i substituir-la per
   «*(revocada — vegeu `config.json`, no versionat)*».
4. Opcionalment reescriure l'historial amb `git filter-repo`. **Només té sentit
   si primer s'ha revocat**; si no, és teatre.

També hi ha un PAT de GitHub a `config.json`. Aquest fitxer **no** està
versionat, però convé comprovar que el PAT té l'àmbit mínim (`contents:write`
sobre aquest repositori i prou) i data de caducitat.

### M-02 · Pre-commit que bloquege secrets · S · impacte mitjà

Un *hook* de `pre-commit` que busque `ghp_`, `github_pat_`, i cadenes de 64
caràcters hexadecimals als fitxers en zona d'espera. Evita repetir M-01.

### M-03 · Versionar el codi del proxy · S · impacte mitjà

El Cloudflare Worker que fa de pont amb l'API de Discourse no té codi font
enlloc. Són ~30 línies. Proposta: carpeta `proxy/` amb `worker.js` i un
`README` de desplegament. Sense això, el dia que el Worker desaparega la
sincronització de fites no es pot restaurar.

Convé aprofitar per a acotar el Worker: ara mateix, si és obert, qualsevol pot
consultar els badges de qualsevol usuari de L'Ardada. Mínim: restringir `Origin`
a `elawesomepanda.github.io` i validar que `username` case amb `/^[\w.-]{1,60}$/`.

---

## B. Interfície i experiència d'ús

### M-04 · Fer-lo utilitzable en mòbil · M · impacte alt

No hi ha cap `@media` a l'`index.html`. Amb `NODE_W = 200` i una capçalera de
quatre files (títol, controls, barra de progrés, llegenda), en una pantalla de
375 px la capçalera se'n menja la meitat.

Proposta concreta:

- Sota 720 px: capçalera plegable (només títol + barra de progrés visibles; els
  controls darrere d'un botó ☰).
- Zoom inicial `0.6` en lloc d'`1` quan `window.innerWidth < 720`.
- Modal a pantalla completa amb desplaçament propi.
- Comprovar que `d3.zoom()` gestiona bé el pessic amb dos dits (ho fa de sèrie,
  però amb `foreignObject` sovint cal `touch-action: none`).

### M-05 · No perdre el zoom en cada `render()` · S · impacte mitjà

Ara mateix, marcar un node com a completat torna la vista al punt de partida. És
el defecte d'ús més molest que hi ha. Solució mínima: guardar
`d3.zoomTransform(svgEl)` abans del `render()` i reaplicar-lo al final, en lloc
de l'enquadrament inicial. També arregla el salt en redimensionar la finestra.

### M-06 · Decidir què fer amb els nodes `valid=FALSE` · S · impacte mitjà

36 dels 73 nodes són `valid=FALSE`: no tenen topic al fòrum, però **sí** es
dibuixen a l'arbre i **sí** compten per al percentatge de progrés. L'alumne veu
nodes que pot marcar com a completats i que no el porten enlloc.

Tres opcions:

| Opció | Efecte |
| --- | --- |
| **a)** No incloure'ls a `nodes.json` | L'arbre sempre és coherent, però desapareix el «mapa del que ve» |
| **b)** Incloure'ls amb un estat visual «en preparació» (tercer estil, no clicable) | Es veu l'itinerari futur sense poder-hi interactuar. **Recomanada.** |
| **c)** Deixar-ho com està | Cap treball, però el progrés menteix |

Si es tria (b), `getCompletionPct()` ha de dividir entre els nodes vàlids.

### M-07 · Filtres per família i etiqueta · M · impacte mitjà

`familia` i `tags` es guarden al CSV, viatgen a `nodes.json`, i **no es fan
servir enlloc de la interfície**. Amb 73 nodes ja costa orientar-se; amb la
branca de dolçaina en seran 150+.

Proposta: barra d'etiquetes a la capçalera; en seleccionar-ne una, els nodes que
no casen baixen a `opacity: 0.15`. Sense reordenar res, per no trencar el layout.
Quan hi haja més d'una família, colorejar la vora de la targeta per família.

### M-08 · Accessibilitat mínima · M · impacte mitjà

Zero `aria-*`, zero `tabindex` al fitxer. Mínims raonables:

- `role="button"` i `tabindex="0"` a les targetes desbloquejades, amb `Enter`
  i `Espai`.
- `aria-label` als botons de zoom (ara són `+`, `−`, `⌂` sense text).
- Focus atrapat dins del modal i tancament amb `Escape` (ara només es tanca amb
  la ✕ o clicant fora).
- `role="progressbar"` amb `aria-valuenow` a la barra de progrés.

### M-09 · Recuperar els *tiers* visuals de les fites · S · impacte baix

`badgeSVG()` existeix amb quatre dissenys (`shield`, `star`, `star2`, `crown`) i
**no es crida mai**. El disseny original preveia distingir visualment fites de
node i fites de branca. Ara totes es pinten igual, amb l'emoji.

Decidir: o es fa servir (afegint un camp `tier` al CSV), o s'esborra. Deixar codi
mort en un fitxer de 1300 línies té un cost real de lectura.

### M-10 · Millores del metrònom lligades al node · M · impacte mitjà

El metrònom ja hi és i està ben fet (planificació *look-ahead* correcta), però
és independent de l'arbre. Els nodes ja diuen «1 minut», «2 minuts», «4 minuts»
en el títol i l'`id` (`_1`, `_2`, `_4`).

Proposta: al modal d'un node, un botó «Practicar» que òbriga el metrònom amb el
temporitzador ja posat als minuts del node, i que en acabar el compte enrere
propose «Ho has aconseguit? → Marcar com a completat». Això tanca el bucle de
gamificació sense afegir dades noves.

Extres barats: compàs configurable (ara `% 4` fix), i un mode de pujada
progressiva de BPM.

---

## C. Contingut

### M-11 · La branca de dolçaina · L · impacte alt

És la mancança més gran del projecte respecte de la proposta original: 72 dels
73 nodes són de percussió, i el disseny original parlava de «la dolçaina, el
tabal i el flabiol».

Recomanació de procés, no de contingut:

1. Definir primer les **fites de branca** de dolçaina (4 o 5), no els nodes.
2. Omplir els nodes entre fites només d'una branca, publicar-la, i **provar-la
   amb un alumne real** abans de fer-ne cap més. Els 36 nodes `valid=FALSE` que
   hi ha ara són l'avís: és fàcil generar estructura més ràpid del que es pot
   validar.
3. Reutilitzar l'esquema tal com està. La família ja és un camp; només cal
   posar-hi `Dolçaina`.

Cal decidir també si la dolçaina penja de `GiT_INICI` (un arbre amb dues
branques grans des de l'arrel) o si té arrel pròpia (dos arbres al mateix
llenç). L'algorisme de layout aguanta les dues coses; visualment, dues arrels
separades quedaran molt millor.

### M-12 · Material real: PDF i àudio · M · impacte alt

Els tipus `pdf`, `mp3`, `mp4` i `link` estan implementats a la interfície i **no
s'usen en cap node**: només hi ha `video` i `image`. El disseny original preveia
partitures en PDF i pistes d'acompanyament en MP3 a Google Drive.

Per als MP3 val la pena un reproductor `<audio>` incrustat al modal en lloc d'un
enllaç de descàrrega — un alumne no es baixarà un fitxer per a practicar.

---

## D. Manteniment i eines

### M-13 · Llevar l'exportació manual del CSV · M · impacte alt

El punt de fricció més gran del dia a dia: editar a Google Sheets → exportar →
copiar el fitxer al repositori → executar l'script. Cada pas és una oportunitat
d'oblidar-se'n, i el CSV actual ja arrossega **927 files buides** d'una
exportació.

Dues alternatives:

| Opció | Avantatge | Cost |
| --- | --- | --- |
| Llegir el full directament amb l'API de Google Sheets | Una sola font, zero exportacions | Cal credencials de servei |
| Publicar el full com a CSV (`/export?format=csv`) i que l'script el descarregue | Molt barat, sense credencials | El full ha de ser públic |

En qualsevol dels dos casos, `crear_topics.js` deixaria de reescriure el CSV
local, i caldria decidir com tornen els `discourse_topic_id` nous al full.

### M-14 · Validador de dades · S · impacte alt

Ara mateix, un error al CSV es descobreix quan l'arbre es veu malament. Un
`--validate` a `crear_topics.js` que comprove i pare abans de tocar res:

- ids duplicats;
- prerequisits que apunten a ids inexistents (ara s'ignoren **en silenci**);
- **cicles** de prerequisits (ja han petat dues vegades — §7.2 de `DESIGN.md`);
- `es_fita=TRUE` sense `fita_nom` o sense `discourse_badge_id`;
- URLs de material buides o amb un `tipus` desconegut;
- nodes orfes (sense prerequisits i que no siguen `GiT_INICI`).

És la millora amb millor relació esforç/benefici de tota la llista.

### M-15 · Arreglar el nom del CSV · S · impacte baix, risc alt si s'ignora

Al disc és `GiT_nodes.csv`, a Git és `GiT_Nodes.csv`, i el codi llig
`'./GiT_Nodes.csv'`. Funciona per accident, perquè Windows no distingeix
majúscules. En un CI de GitHub Actions (Linux) o en un Mac configurat com a
sensible, peta.

Arreglada amb `git mv --force` i canviant la cadena del codi. Cinc minuts ara,
una hora de desconcert el dia que es munte un CI.

### M-16 · `package.json` · S · impacte baix

No n'hi ha cap. `crear_topics.js` fa servir `import` i només funciona per la
detecció automàtica de sintaxi de Node ≥ 22. Un `package.json` amb
`"type": "module"`, `"engines": { "node": ">=20.19" }` i uns scripts
(`npm run dry`, `npm run nodes`, `npm run publish`) fa el projecte reproduïble i
documenta la versió mínima.

### M-17 · Partir `index.html` · M · impacte mitjà · risc mitjà

1313 línies amb CSS i JS dins. Encara és manejable, però cada millora de la
llista B el fa créixer. Partició mínima sense muntar cap eina de compilació:
`index.html` + `styles.css` + `app.js` (mòdul ESM). GitHub Pages els serveix
igual de bé.

**No urgent.** El cost real és que qualsevol edició al fitxer obliga a llegir-ne
molt de context. Si es fa, fer-ho **abans** de les millores de la secció B, no
després.

### M-18 · Automatitzar el desplegament · S · impacte baix

Ara `crear_topics.js` puja `nodes.json` per l'API de contingut de GitHub amb un
PAT. Funciona, però barreja generació de dades amb desplegament, i lliga el PAT
a la màquina de l'autor. Alternativa: l'script només genera el fitxer, i un
`git commit` normal (o una GitHub Action) el publica.

---

## E. Verificació

### M-19 · Comprovar-ho de veritat en un navegador · S · impacte alt

Res del comportament visual d'aquest projecte s'ha verificat en execució en
aquesta revisió: està tot llegit del codi (§9 de `DESIGN.md`). Abans de tocar
res convindria obrir-lo amb `npx serve .` i comprovar, com a mínim: que carrega
els 73 nodes, que el modal obri i tanque, que el vídeo pare en tancar, que la
sincronització amb Discourse respon, i que el metrònom sona.

### M-20 · Prova amb un alumne real · M · impacte alt

És l'últim punt de la llista de «pròxims passos» del disseny original i encara
està pendent. El flux complet (registrar-se a L'Ardada → completar una branca →
publicar al topic → el moderador atorga el badge → sincronitzar) **no s'ha provat
mai de punta a punta**. Fins que no es faça, tot el nivell 2 de persistència és
teòric.

---

## Ordre suggerit

| Fase | Millores | Per què ací |
| --- | --- | --- |
| **0. Hui** | M-01 | Una credencial d'administrador exposada en públic |
| **1. Fonaments** | M-14, M-15, M-16, M-03, M-19 | Barates, i totes protegeixen la feina posterior |
| **2. Ús** | M-05, M-06, M-04, M-08 | El que nota l'alumne |
| **3. Contingut** | M-12, M-20, M-11 | Provar el flux sencer **abans** de generar la branca gran |
| **4. Refinament** | M-07, M-10, M-09, M-13, M-17, M-18 | Quan el contingut ja siga estable |

L'ordre de la fase 3 és deliberat: M-20 (provar el circuit complet amb un alumne)
va **abans** de M-11 (crear la branca de dolçaina). Val més descobrir que el flux
de badges falla amb 73 nodes que amb 150.
