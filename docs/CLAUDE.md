# CLAUDE.md — Meta-instruccions per a aquest projecte

Complementa les instruccions globals. Ací només va el que és **específic**
d'aquest repositori.

---

## Abans de tocar res

Llig `docs/DESIGN.md`. Està escrit perquè no hages d'obrir tots els fitxers.
Si la resposta hi és, no gastes tokens explorant el codi.
Si no hi és, busca-la, arregla-la **i apunta-la a `DESIGN.md`**.

---

## Regles dures

### 0. Valida abans de res

Per a l'autor hi ha `arbre.bat` (doble clic, menú). Des d'ací, el que val és:

```bash
npm run validate
```

Reporta cada problema amb un suggeriment concret d'arreglament. Els errors paren
qualsevol execució; els avisos no. S'executa sempre, en tots els modes.

Els avisos que isquen són informació de l'estat de les dades, no errors teus.
Llig-los abans de donar res per trencat.

### 1. `nodes.json` no s'edita mai a mà

És un fitxer generat. La font de veritat és `GiT_nodes.csv`.
Per a regenerar-lo sense tocar Discourse ni GitHub:

```bash
node crear_topics.js --only-nodes
```

Si et demanen un canvi de dades, canvia el CSV. Si el canvi és estructural,
canvia `filelaANode()` **i** regenera.

### 2. Cap crida real a Discourse ni a GitHub sense permís explícit

`node crear_topics.js` sense flags **escriu al fòrum públic de L'Ardada i fa un
commit al repositori**. No és reversible sense feina.

- `--dry-run` i `--only-nodes` es poden executar lliurement: no toquen res de fora.
- Qualsevol execució sense flags, o amb `--force-all`, s'ha de consultar abans,
  mostrant la sortida del `--dry-run` corresponent.

### 3. Cap credencial en un fitxer versionat

`config.json` i `config.gs` estan al `.gitignore` i han de continuar estant-hi.
Abans de qualsevol `git add`, comprova que no entra cap clau.
Aquesta regla ja s'ha trencat una vegada: vegeu `MILLORES.md` M-01.

Si trobes una credencial en un fitxer versionat: **avisa immediatament, no
l'esborres i faces commit sense dir-ho**. Esborrar-la del fitxer no la lleva de
l'historial; el que compta és revocar-la.

### 4. Idioma

- Documentació, comentaris del codi i textos de la interfície: **valencià**.
- Identificadors del codi: **anglés**.
- Les dades del CSV (títols, descripcions, noms de fita): valencià, i és
  contingut didàctic — no el reescrigues per iniciativa pròpia.

### 5. Els botons de la interfície van per `onclick` inline

`index.html` crida les funcions globals des de l'atribut `onclick` de l'HTML.
**Renombrar una funció global trenca el botó en silenci**, sense error de
consola visible fins que algú el prem. Si en renombres una, fes `grep` del nom
antic per tot `index.html`.

---

## Com provar els canvis

`index.html` fa `fetch('nodes.json')`, així que **obrir-lo amb `file://` no
funciona** (falla per CORS). Cal un servidor:

```bash
npx serve .
```

No hi ha proves automatitzades. La verificació és manual; la llista mínima està
a `MILLORES.md` M-19.

Comprovació ràpida de la integritat de les dades sense obrir el navegador:

```bash
node crear_topics.js --dry-run
```

---

## Estat dels documents

| Fitxer | Es pot tocar lliurement? |
| --- | --- |
| `BACKLOG.md` | Sí |
| `MILLORES.md` | Sí per a afegir propostes noves; marcar les fetes, no esborrar-les |
| `DESIGN.md` | **Només sota confirmació**, i sempre amb literals extrets amb `grep` |
| `ROADMAP.md` | **Només sota confirmació**; els canvis de pla van amb data |
| `USERGUIDE.md` | S'omple al final, aïlladament |
| `originaldesign.md` | **No tocar**: és el document històric. Excepció: llevar la clau filtrada |

---

## Coses que no són el que semblen

Llista curta; la completa està a `DESIGN.md` §7 i §8.

- **El CSV real no es versiona.** `GiT_nodes.csv` viu al disc de l'autor i està
  al `.gitignore`; el repositori només porta `GiT_nodes.exemple.csv`. En una
  clonació nova, `npm run validate` fallarà amb `ENOENT` fins que el CSV real
  hi siga. La ruta és la constant `CSV_PATH`.
- **La columna `valid` no filtra res de l'arbre.** Només decideix què es publica
  al fòrum. El que mana és `discourse_topic_id`, via `esPublicat()`. Prova:
  `GiT_INICI` té `valid=FALSE` i és l'arrel de tot.
- **Els nodes sense publicar es dibuixen «en preparació»**, no s'amaguen: es
  veuen, no es poden clicar, i no compten per al progrés.
- **`badgeSVG()` és codi mort.** No l'esborres sense preguntar: és la base d'una
  funcionalitat prevista.
- **`wrapper.innerHTML = m.url`** al modal no és un descuit: és el suport del
  format antic on la cel·la portava l'`<iframe>` sencer.
- **`.clasp.json`, `config.gs`, `appsscript.json`** són restes d'una versió
  abandonada en Google Apps Script. No formen part del flux actual.
- **`eines/menu.ps1` ha d'anar en UTF-8 AMB BOM.** PowerShell 5.1 llig els `.ps1`
  sense BOM com a ANSI i destrossa tots els accents, fins al punt de donar
  errors de sintaxi falsos. Si l'edites amb una eina que lleve el BOM, el fitxer
  deixa de funcionar sense que el motiu siga evident.

---

## Enllaços

- Repositori: <https://github.com/ElAwesomePanda/dolcaina-skill-tree>
- Producció: <https://elawesomepanda.github.io/dolcaina-skill-tree>
- Fòrum: <https://ardada.discoursehosting.net> (categoria `17`)
