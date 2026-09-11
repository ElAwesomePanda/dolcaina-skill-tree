# USERGUIDE.md — Guia d'ús

> **Estat: 2026-09-11.** La Part B està escrita després d'executar cada pas, tret
> de la publicació de veritat. La Part A està escrita llegint el codi: **cap
> alumne l'ha llegida encara**, i no hi ha captures de pantalla. Vegeu
> `ROADMAP.md`, fase 5.

Dues guies en una: la **Part A** és per als alumnes del taller i no requereix
saber res d'informàtica. La **Part B** és per a qui manté l'arbre.

---

# Part A — Per als alumnes

## Què és això

Un mapa del taller de Dolçaina i Tabalet. Cada quadre és un exercici. Es
desbloquegen a mesura que completes els anteriors, com en un videojoc. Alguns
porten una **fita**, que és una insígnia que et guanyes al fòrum de L'Ardada.

## Com hi entre

Obri aquesta adreça al navegador (val el del mòbil):

<https://elawesomepanda.github.io/dolcaina-skill-tree>

No cal instal·lar res ni registrar-se per a mirar-lo.

## Com es llig

L'arbre creix **de baix cap amunt**. A baix del tot hi ha el començament; les
fletxes indiquen què desbloqueja què.

Els quadres tenen quatre estats:

| Estat | Aspecte | Què vol dir |
| --- | --- | --- |
| **Disponible** | daurat, ben visible | El pots fer ara. Fes-hi clic |
| **Completat** | verd, amb un ✓ | Fet |
| **Bloquejat** | gris, amb un 🔒 | Encara no. Has de fer abans els que hi apunten |
| **En preparació** | molt apagat, vora de ratlletes | El professor encara no l'ha acabat. Serveix per a veure què vindrà |

Ni els bloquejats ni els «en preparació» es poden clicar. No és una errada.

La diferència entre els dos és de qui depén: un **bloquejat** s'obri quan
*tu* faces els exercicis anteriors; un **en preparació** s'obri quan *el
professor* el publique.

## Moure's per l'arbre

- **Arrossegar** amb el ratolí (o el dit) per a desplaçar-te.
- **Roda del ratolí** o **pessic amb dos dits** per a fer zoom.
- Botons **+**, **−** i **⌂** a la dreta. El **⌂** torna al començament.
- **▶ Últim node** et porta al primer exercici que tens disponible i encara no
  has fet. És la manera ràpida de reprendre on ho vas deixar.

## Fer un exercici

Fes clic en un quadre daurat. S'obri una fitxa amb la descripció, la fita si en
té, un enllaç al fòrum per a preguntar o comentar, el material i el botó
**Marcar com a completat**.

Els **vídeos** i les **pistes d'àudio** es veuen i s'escolten ací mateix, sense
eixir de l'arbre. En tancar la fitxa es paren soles.

Marca'l només quan te'n faces, de veritat. L'arbre és per a tu.

## El metrònom

Botó **♩ Mètronom** a la capçalera:

- **BPM**: la velocitat, de 40 a 240. Amb la barra o escrivint-la.
- **Timer**: compte enrere d'1 a 5 minuts, o «Lliure» per a no parar.
- **▶ Iniciar** / **■ Parar**.

El primer temps de cada compàs de 4 sona més greu. El puntet fa flaix a cada
temps.

## El progrés i les fites

La barra de la capçalera diu quant portes fet. Compta només sobre els exercicis
publicats: els que estan «en preparació» ni sumen ni resten.

**El progrés es guarda al navegador que gastes.** Si canvies de mòbil a
ordinador, o esborres les dades de navegació, es perd. Per a no dependre d'això
hi ha les **fites**.

Quan completes una branca sencera te'n guanyes una. Per a reclamar-la:

1. Fes-te un compte a **L'Ardada**: <https://ardada.discoursehosting.net>
2. Entra al tema del fòrum de l'exercici (l'enllaç està a la fitxa) i publica-hi
   que l'has aconseguida.
3. El professor et dona la insígnia.
4. Torna a l'arbre, escriu el teu nom d'usuari de L'Ardada a la casella **Usuari
   L'Ardada** de dalt i prem **Sincronitzar fites**.

L'arbre marcarà com a completats la fita i tot el que hi porta. La sincronització
**només afig**: mai et lleva res que ja tingueres marcat.

## Reiniciar

El botó **↺ Reset** esborra tot el teu progrés local. Demana confirmació. Les
insígnies de L'Ardada no s'esborren: es recuperen tornant a sincronitzar.

## Coses que confonen

| Passa açò | Explicació |
| --- | --- |
| Desmarque un node i se'n desmarquen uns quants més | És volgut: si no tens la base, no pots tindre el que ve després |
| Un quadre està tan apagat que quasi no es veu | És un «en preparació». Encara no està fet |
| «Error: usuari no trobat a L'Ardada» | Revisa que el nom d'usuari estiga ben escrit. Si continua, avisa el professor: potser és el servidor |
| El progrés no és el mateix al mòbil i a l'ordinador | És normal: es guarda per navegador. Sincronitza les fites en tots dos |
| El vídeo no es veu | Recarrega. Alguns bloquejadors d'anuncis molt estrictes bloquegen YouTube |
| La barra de progrés no arriba al 100 % encara que ho tinga tot | Pot quedar algun exercici publicat que depén d'un altre encara en preparació. Avisa el professor |

---

# Part B — Per a qui manté l'arbre

## Com funciona per dins, en curt

Hi ha un **full de càlcul** de Google amb un node per fila. El programa el
descarrega, publica cada node com un tema del fòrum de L'Ardada, i genera un
fitxer `nodes.json` que és el que llig la pàgina web, allotjada gratis a GitHub
Pages.

```
Full de càlcul de Google
        │  (només lectura)
        ▼
   GiT_nodes.csv  ──►  crear_topics.js  ──┬──►  temes a Discourse
                                          └──►  nodes.json  ──►  GitHub Pages
```

La fletxa cap avall és d'un sol sentit: **el programa llig el full però no pot
escriure-hi**. Per això hi ha dos passos manuals (§«Els dos fitxers per a
enganxar»).

L'única peça que corre fora és un «Worker» de Cloudflare que serveix per a
consultar les insígnies d'un usuari sense exposar la clau de l'API. Està
documentat a `proxy/README.md`.

## Muntar-ho al teu ordinador des de zero

### 1. Instal·la Node.js

Baixa'l de <https://nodejs.org> i tria la versió **LTS**. Cal la **20.19 o
posterior**. Per a comprovar-ho:

```bash
node --version
```

### 2. Baixa el projecte

```bash
git clone https://github.com/ElAwesomePanda/dolcaina-skill-tree.git
```

O des de la pàgina del repositori: botó verd **Code** → **Download ZIP**.

### 3. Posa les credencials

Crea un fitxer `config.json` a l'arrel del projecte:

```json
{
  "GITHUB_TOKEN":           "...",
  "GITHUB_OWNER":           "elawesomepanda",
  "GITHUB_REPO":            "dolcaina-skill-tree",
  "GITHUB_BRANCH":          "main",
  "DISCOURSE_API_KEY":      "...",
  "DISCOURSE_API_USERNAME": "el_teu_usuari_admin",
  "DISCOURSE_BASE_URL":     "https://ardada.discoursehosting.net",
  "DISCOURSE_CATEGORY_ID":  17,
  "SHEET_ID":               "...",
  "SHEET_GID":              "..."
}
```

- El **token de GitHub** es genera a Settings → Developer settings → Personal
  access tokens.
- La **clau de Discourse**, a
  `https://ardada.discoursehosting.net/admin/api/keys`.
- El **`SHEET_ID`** i el **`SHEET_GID`** es trauen de la URL del full:
  `docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<SHEET_GID>`

⚠️ **Aquest fitxer no s'ha de pujar mai a GitHub.** Ja està al `.gitignore`.

L'identificador del full no és una contrasenya, però **hi va ací a propòsit**: el
full està compartit en mode lectura per enllaç, i el repositori és públic. Si
l'id estiguera al codi, qualsevol que trobara el repositori podria obrir el full.

### 4. Baixa les dades

**El repositori no porta el `GiT_nodes.csv` de veritat**, a propòsit: les dades
viuen al full de càlcul. Una clonació nova no en té cap.

Fes doble clic a `arbre.bat` i tria l'opció **1**. Ja tens les dades.

(Al repositori sí que hi ha un `GiT_nodes.exemple.csv` amb quatre files, només
per a poder entendre l'esquema de les columnes.)

## El menú: `arbre.bat`

Doble clic a **`arbre.bat`**, a l'arrel del projecte:

```
   ── Dades ──────────────────────────────────
   1. Importar del full de càlcul
   2. Validar les dades
   3. Regenerar l'arbre (nodes.json)
   7. Informe d'incidències (i guardar-lo)
   9. Insígnies: quines falten i quin id tenen
   8. Importar un CSV de Baixades (reserva)

   ── Provar ─────────────────────────────────
   4. Veure l'arbre al navegador
   5. Assaig de publicació (no toca res)

   ── Publicar ───────────────────────────────
   6. PUBLICAR al fòrum i a GitHub
```

El camí normal és **1 → 2 → 3 → 4**, i quan estigues content, **5 → 6**.

| Opció | Què fa | Toca res de fora? |
| --- | --- | --- |
| **1** | Baixa el full, t'ensenya què canvia, fa còpia de seguretat i demana confirmació | No |
| **2** | Valida. Cada problema porta un suggeriment d'arreglament | No |
| **3** | Regenera `nodes.json` al teu disc | No |
| **4** | Obri l'arbre a <http://localhost:3111> | No |
| **5** | Assaig: et diu què es crearia i què s'actualitzaria | No |
| **6** | **Publica al fòrum públic i fa un commit a GitHub** | **SÍ** |
| **7** | Informe de validació, guardat a `copies\informes\` | No |
| **8** | Com la 1, però agafant el CSV més recent de Baixades | No |
| **9** | Creua les fites amb les insígnies del fòrum | No |

Només la **6** escriu fora, i abans t'ensenya l'assaig i et fa escriure
`PUBLICAR` en majúscules. Si la validació falla, no et deixa continuar.

Les importacions (1 i 8) guarden les **3 últimes còpies** del CSV a `copies\`.
Les més velles s'esborren soles.

## Els dos fitxers per a enganxar

Com que el programa no pot escriure al full, hi ha dues coses que has de copiar
tu. Les dues es generen com a fitxers de dues columnes per a poder-les enganxar
en bloc.

### `badges_nous.csv` — les insígnies (opció 9)

Cada fita necessita una insígnia creada **a mà** al fòrum i el seu número apuntat
al full. Per a no haver de buscar-lo:

1. Al full, posa el nom que vols a `discourse_badge_name`, per exemple
   `GiT_ERM_REDOBLE`.
2. Crea la insígnia al fòrum amb **eixe nom exacte**:
   `https://ardada.discoursehosting.net/admin/badges`.
3. Menú → **9**:

```
  PERC_ERM_REDOBLE_02      "GiT_ERM_REDOBLE"  →  id 119
```

4. Enganxa `badges_nous.csv` a la columna `discourse_badge_id` del full.

L'opció 9 també t'avisa si has escrit el nom amb una errada (et diu quin s'hi
assembla), si un número apunta a una insígnia inexistent, i quines insígnies del
fòrum no les gasta cap node.

⚠️ **La insígnia ha d'estar posada abans de publicar la fita.** Si publiques
sense ella, «Sincronitzar fites» no desbloquejarà eixa branca encara que l'alumne
tinga la insígnia concedida.

### `ids_nous.csv` — els temes (després de publicar)

En publicar, Discourse assigna un número de tema a cada node nou. El programa
l'apunta al CSV **del teu ordinador**, però no al full. Per això genera:

```
id,discourse_topic_id
PERC_ERM_BEAT_01,712
PERC_ERM_CONTRA_01,713
```

Enganxa'l a la columna `discourse_topic_id` del full, **just després de
publicar**.

⚠️ **Si no ho fas, la pròxima importació portarà eixos nodes sense número i el
programa tornarà a crear els temes: acabaries amb temes duplicats al fòrum.**

## Afegir o canviar nodes

1. **Edita el full de càlcul.** Les 21 columnes estan documentades a
   `docs/DESIGN.md` §2.1. Les que més s'usen:
   - `id` — identificador únic, sense espais. Sense `id` la fila s'ignora.
   - `valid` — `TRUE` perquè es publique al fòrum. `FALSE` = no el toques.
   - `force_update` — `TRUE` per a reenviar un node ja publicat.
   - `prerequisits` — ids separats per comes, **entre cometes**: `"A,B"`.
   - `mat1_*` / `mat2_*` — fins a **dos** materials per node.
2. Menú → **1** (importar), **2** (validar), **3** (regenerar), **4** (mirar-ho).
3. Quan estiga bé: **5** (assaig) i **6** (publicar).
4. Enganxa `ids_nous.csv` al full.

### Amagar una branca temporalment

La columna **`actiu`** decideix si el node ix a l'arbre. Posa-li `FALSE` a les
files que vulgues amagar, importa (opció 1) i regenera (opció 3).

Serveix per a centrar una sessió del taller en una branca concreta. **No toca
res del fòrum**: els temes continuen existint i els identificadors es conserven.
Per a tornar-ho arrere, `TRUE` una altra vegada.

Els alumnes **no perden el progrés**: el que tenien fet es guarda per
identificador al seu navegador, i quan tornes a activar la branca hi torna a
aparéixer marcat.

### Tres columnes que es confonen fàcilment

| Columna | Què decideix |
| --- | --- |
| `actiu` | Si el node **es veu a l'arbre** |
| `valid` | Si el programa el **publica o actualitza al fòrum** |
| `discourse_topic_id` | Si **ja està publicat**; si està buit, ix «en preparació» |

Són independents. Els dos errors típics:

- Posar **`valid=FALSE` per a amagar** un node de l'arbre: no fa res a l'arbre,
  només deixa d'actualitzar-lo al fòrum. El node es continua veient.
- **Buidar el `discourse_topic_id`** per a amagar-lo: el node desapareix de la
  vista, però el programa deixa de saber que ja estava publicat i **tornaria a
  crear el tema, duplicat**. No ho faces mai: per a amagar, `actiu`.

## El camí manual, sense menú

Per si algun dia el menú no funciona. Des de la carpeta del projecte:

```bash
npm run validate    # valida i prou
npm run dry         # assaig: diu què passaria
npm run nodes       # regenera nodes.json
npm run publish     # PUBLICA de veritat
npm run serve       # servidor local per a veure l'arbre
```

**Obrir `index.html` fent-hi doble clic no funciona**: el navegador bloqueja la
càrrega de `nodes.json`. Cal el servidor.

## Si alguna cosa falla

| Símptoma | Què fer |
| --- | --- |
| El `.bat` s'obri i es tanca de colp | Falta Node.js, o falta `config.json`. Obri'l des d'una finestra de terminal per a llegir el missatge |
| «No trobe Node.js» | Instal·la'l de <https://nodejs.org>, versió LTS |
| «Falta config.json» | Mira el pas 3 de «Muntar-ho des de zero» |
| L'opció 1 diu que el full ha respost 401 | El full ha deixat de ser accessible. Al full: Comparteix → Accés general → «Qualsevol amb l'enllaç» (Lector) |
| La validació dona errors | Llig els suggeriments: cadascun et diu quina cel·la del full tocar |
| «Error carregant nodes.json» al navegador | Has obert l'`index.html` amb doble clic. Gasta l'opció 4 del menú |
| Un exercici publicat no es desbloqueja mai | Depén d'un que encara està en preparació. L'opció 2 t'ho diu i et dona el progrés màxim assolible |
| Has publicat i el fòrum té temes duplicats | No vas enganxar `ids_nous.csv` al full. Esborra els duplicats al fòrum i apunta els números bons |

Per a diagnosticar res més endins, `docs/DESIGN.md` §6 té una taula de
símptomes amb la línia de codi on mirar.
