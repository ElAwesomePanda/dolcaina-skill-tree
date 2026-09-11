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

- [ ] **M-12** Afegir material real de tipus `pdf` i `mp3` a nodes existents
      (reproductor d'àudio incrustat al modal)
- [ ] Publicar els 36 nodes `valid=FALSE` que estiguen realment llestos, o
      llevar-los del CSV si no ho estan
- [ ] **M-20** Prova de punta a punta amb un alumne real: registre a L'Ardada →
      completar una branca → publicar al topic → el moderador atorga el badge →
      sincronitzar a l'arbre
- [ ] **M-11** Branca de dolçaina: **primer les fites**, després els nodes, i
      només d'una branca

> ### ⛳ Punt de control 3
> - Un alumne que no és l'autor ha completat una branca sencera i el badge s'ha
>   sincronitzat correctament a l'arbre en un dispositiu diferent.
> - La branca de dolçaina té les fites definides i **una** subbranca publicada i
>   provada.
>
> **No generar la resta de la branca de dolçaina fins que aquest punt de control
> passe.** El motiu és empíric: ja hi ha 36 nodes creats i mai validats.

---

## Fase 4 — Refinament

Objectiu: qualitat de vida, una vegada el contingut siga estable.

- [ ] **M-07** Filtres per família i etiqueta (necessari en superar els ~100 nodes)
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

- **Flabiol.** El disseny original el menciona, però amb la dolçaina encara
  sense començar no té sentit obrir un tercer instrument.
- **Compte d'usuari propi.** L'autenticació la fa Discourse. Duplicar-la seria
  mantindre dos sistemes d'identitat per a un taller de poble.
- **Progrés per alumne visible per al professor.** Implicaria emmagatzematge de
  dades personals de menors. Si algun dia cal, ha d'anar per Discourse, no per
  l'arbre.
- **Framework de front-end.** El disseny original tria JS vanilla a propòsit
  («zero dependències»). D3 ja és l'única excepció i és suficient.

---

## Registre de canvis de pla

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
