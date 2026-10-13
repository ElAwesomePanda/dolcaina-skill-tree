# ROADMAP.md — Arbre de Fites · Dolçaina i Tabalet

Pla per fases amb punts de control. Cada fase acaba amb una **validació** que ha
de passar abans de començar la següent: la finalitat és no propagar problemes a
la resta del projecte.

Els canvis de pla s'apunten al registre del final, amb data.

---

## Fase 0 — Ja fet (estat el 2026-09-10)

| Fet | On |
| --- | --- |
| Arbre interactiu amb layout automàtic, zoom i desplaçament | `index.html` |
| Modal de node amb material incrustat (vídeo de YouTube, imatges de Drive) | `openModal()` |
| Progrés local a `localStorage` | `STATE_KEY` |
| Sincronització de fites via badges de Discourse a través d'un proxy | `syncDiscourse()` |
| Metrònom amb temporitzador | §3.9 de `DESIGN.md` |
| Pipeline CSV → Discourse → `nodes.json` → GitHub | `crear_topics.js` |
| 73 nodes definits, 37 publicats al fòrum | `GiT_nodes.csv` |
| Desplegament a GitHub Pages | — |

**Pendent d'aquesta fase:** hi ha 4 fitxers amb canvis sense confirmar
(`GiT_Nodes.csv`, `crear_topics.js`, `index.html`, `nodes.json`) i 15 nodes amb
`force_update=TRUE` que encara no s'han reenviat a Discourse. Cal tancar-ho
abans de començar la fase 1.

---

## Fase 1 — Tapar la fuita i assegurar els fonaments

Objectiu: que el projecte es puga tocar sense por i sense sorpreses.

- [ ] **M-01** Revocar la clau de Discourse filtrada i emetre'n una de nova amb
      àmbit restringit
- [ ] **M-15** Unificar el nom del CSV (disc / Git / codi)
- [ ] **M-16** `package.json` amb `"type": "module"`, `engines` i scripts
- [ ] **M-14** `--validate` a `crear_topics.js` (duplicats, prerequisits
      penjants, cicles, fites incompletes)
- [ ] **M-03** Versionar el codi del Cloudflare Worker a `proxy/`
- [ ] **M-19** Repàs manual complet al navegador i apuntar el resultat a
      `DESIGN.md` §9

> ### ⛳ Punt de control 1
> - `node crear_topics.js --validate` passa amb 0 errors sobre el CSV actual.
> - `node crear_topics.js --dry-run` funciona en una màquina que no siga la de
>   l'autor (o en un contenidor Linux).
> - La clau vella està revocada i comprovada: una crida amb ella retorna 403.
> - L'arbre s'ha obert al navegador i les funcions bàsiques responen.
>
> Si el validador troba errors a les dades, arreglar-los **ací**, no en fases
> posteriors.

---

## Fase 2 — Que siga usable de veritat

Objectiu: que un alumne amb un mòbil el puga fer servir sense frustrar-se.

- [ ] **M-05** Conservar el zoom i el desplaçament entre `render()`
- [ ] **M-06** Decidir i aplicar el tractament dels nodes `valid=FALSE`
      (recomanació: estat visual «en preparació», i el progrés només sobre nodes
      vàlids)
- [ ] **M-04** Adaptació a mòbil (capçalera plegable, zoom inicial, modal a
      pantalla completa)
- [ ] **M-08** Accessibilitat mínima (teclat, `aria-label`, `Escape` al modal)

> ### ⛳ Punt de control 2
> - Provat en un mòbil real, no només amb el simulador del navegador.
> - Marcar un node no mou la vista.
> - El percentatge de progrés reflecteix una xifra defensable.
> - L'arbre es pot recórrer sencer només amb el teclat.
>
> **Ací és on cal ensenyar-lo a algú que no siga l'autor**, abans d'invertir en
> contingut.

---

## Fase 3 — Contingut i circuit complet

Objectiu: validar el bucle sencer de gamificació abans d'escalar-lo.

- [x] **M-12** Afegir material real de tipus `mp3` a nodes existents — 2026-09-24.
      20 materials `mp3` al CSV. Van per `<iframe>` de Drive, **no** per
      `<audio>` (DESIGN §7.9). De `pdf` encara no n'hi ha cap.
- [x] Publicar els nodes `valid=FALSE` que estigueren llestos — 2026-09-24.
      Els 111 nodes del CSV estan tots actius i tots publicats.
- [x] **M-20** Prova de punta a punta — 2026-09-24. Feta per l'autor i també
      amb gent poc tecnològica del taller: registre → completar → badge →
      sincronitzar.
- [ ] **M-11** Primera branca d'instrument de vent: **flabiol**, no dolçaina
      (vegeu el registre de canvis de 2026-10-08). 27 graons escrits i validats
      a `flabiol_nodes.csv`; falta importar-los al full, crear les 6 insígnies
      `GiT_FLAB_*` i penjar els mp3.

> ### ⛳ Punt de control 3
> - ~~Un alumne que no és l'autor ha completat una branca sencera i el badge
>   s'ha sincronitzat correctament.~~ **Passat el 2026-09-24.**
> - La branca de flabiol té les fites definides i **una** subbranca publicada i
>   provada. ← *pendent*
>
> **No generar més branques d'instrument fins que aquest punt de control passe.**
> El motiu és empíric: ja va passar una vegada que hi havia 36 nodes creats i
> mai validats.

---

## Fase 4 — Refinament

Objectiu: qualitat de vida, una vegada el contingut siga estable.

- [ ] **M-07** Filtres per família i etiqueta. **El llindar ja s'ha superat**:
      111 nodes publicats i 24 etiquetes en ús. La columna `familia` ja té ús
      visual (el hue, DESIGN §3.4), que és mitja passa cap ací.
- [ ] **M-10** Metrònom lligat al node (botó «Practicar» amb el temporitzador posat)
- [ ] **M-09** Decidir sobre `badgeSVG()`: *tiers* visuals o esborrar-lo
- [ ] **M-13** Llevar l'exportació manual del CSV
- [ ] **M-17** Partir `index.html` en `index.html` + `styles.css` + `app.js`
- [ ] **M-18** Separar la generació de dades del desplegament
- [ ] **M-02** *Hook* de `pre-commit` contra secrets

> ### ⛳ Punt de control 4
> - `index.html` per davall de 500 línies.
> - Cap regressió respecte del punt de control 2 (repassar la mateixa llista).

---

## Fase 5 — Tancament

- [ ] Omplir `USERGUIDE.md` de veritat, amb captures i provat per algú de fora
- [ ] Repàs final de `DESIGN.md` contra el codi (literals amb `grep`)
- [ ] Buidar `BACKLOG.md` del que ja no aplique

---

## Fora d'abast (per ara)

Decisions preses per a **no** fer, i el motiu:

- ~~**Flabiol.**~~ **Ja no està fora d'abast des del 2026-10-08**: és la primera
  branca de vent que es fa, per davant de la dolçaina. Vegeu el registre.
- **Compte d'usuari propi.** L'autenticació la fa Discourse. Duplicar-la seria
  mantindre dos sistemes d'identitat per a un taller de poble.
- **Progrés per alumne visible per al professor.** Implicaria emmagatzematge de
  dades personals de menors. Si algun dia cal, ha d'anar per Discourse, no per
  l'arbre.
- **Framework de front-end.** El disseny original tria JS vanilla a propòsit
  («zero dependències»). D3 ja és l'única excepció i és suficient.

---

## Registre de canvis de pla

- **2026-10-08** — **El flabiol passa de «fora d'abast» a ser la primera branca
  de vent**, per davant de la dolçaina. El motiu no és de planificació sinó de
  material: ja existia una progressió escrita de respiració i digitació sobre
  «Què és l'estiu per a mi?» i 29 mp3 sintetitzats dels exercicis, així que la
  branca es podia muntar sencera en una tarda. La dolçaina continua sense
  començar.
  - Els 27 graons queden a `flabiol_nodes.csv` amb `valid=FALSE`: entren a
    l'arbre com a «en preparació», visibles i no clicables.
  - **Gaita i flabiol comparteixen `familia=Gaita`**; la partícula `FLAB_` de
    l'id és el que els distingeix. Es va descartar una família pròpia per a no
    partir el color de la branca de vent en dos.
  - S'afegeix el hue per família a les targetes (DESIGN §3.4). No estava a cap
    fase: surt de la necessitat pràctica de distingir dos instruments en el
    mateix arbre.
  - La barra de progrés **continua sent global sobre tots els nodes publicats**,
    sense mirar la família. Amb dos instruments això vol dir que el percentatge
    ja no significa gran cosa per a un alumne concret. **Decisió pendent**, i
    és previ a M-07.
- **2026-09-24** — Punt de control 3 passat en la part de badges: prova de punta
  a punta feta amb gent del taller, no només per l'autor. Es desamaga la
  lateralitat i es publiquen tots els nodes pendents (111 al CSV, tots actius i
  publicats).
- **2026-09-10** — Creació d'aquest document a partir d'`originaldesign.md` i
  d'una revisió completa del codi. Diferències respecte de la llista de
  «pròxims passos» original:
  - L'API key de Discourse ja està generada, **però filtrada al repositori
    públic**; passa a ser la fase 0 de tot.
  - «Definir l'arbre complet» s'ha fet a mitges: 73 nodes de percussió, cap de
    dolçaina. Es reordena perquè la prova amb un alumne real vaja **abans** de
    generar més contingut.
  - «Polir disseny (baix→dalt, zoom/pan, capçalera fixa, crèdit)» està fet.
    S'afegeix mòbil i accessibilitat, que el document original no contemplava.
  - «Crear els badges reals» està fet (7 fites amb `discourse_badge_id`).
