# Arbre de fites / Skill Tree - Taller de Dolçaina i Tabalet

## Context general

Els Tallers de Dolçaina i Tabalet són una iniciativa comunitària de L'Ardada orientada a recuperar la pràctica col·lectiva de la dolçaina, el tabal i el flabiol al poble. Per estructurar el procés d'aprenentatge de forma clara, motivadora i accessible, s'ha decidit crear un **arbre de fites interactiu gamificat** (skill tree), similar als sistemes de progressió de videojocs RPG o plataformes com Duolingo.

L'objectiu és que cada alumne puga navegar visualment el seu itinerari formatiu, veure quines habilitats ha completat, quines té disponibles i quines estan bloquejades, i accedir al material didàctic associat a cada node.

---

## Concepte: l'arbre de fites

### Estructura d'un node

Cada habilitat de l'arbre és un **node** amb la següent estructura:

```json
{
  "id": "PERC_PL_1",
  "familia": "Percussió",
  "tags": ["Tabal", "Beat", "Mètronom"],
  "titol": "PL al beat · 1 minut",
  "descripcio": "Descripció de l'exercici...",
  "prerequisits": ["ID_NODE_ANTERIOR"],
  "fita": {
    "nom": "Nom del badge",
    "descripcio": "Descripció curta del badge",
    "icona": "crown",
    "discourse_grup": "nom-del-grup-discourse"
  },
  "material": [
    { "tipus": "pdf", "nom": "Nom del fitxer", "url": "https://drive.google.com/..." },
    { "tipus": "mp3", "nom": "Pista d'àudio", "url": "https://drive.google.com/..." }
  ],
  "discourse_topic_id": 42
}
```

**Notes sobre l'estructura:**

- `prerequisits` és suficient per inferir les connexions de l'arbre — no cal duplicar amb camps com "connecta_a" o "es_prerequisit_de"
- `discourse_topic_id` és el topic de L'Ardada on l'alumne pot postar per reclamar el badge
- Els materials pesants (PDF, MP3) van allotjats a **Google Drive** i s'enllaçen des del node

### Tipus de fites (tiers)

Hi haurà dos nivells de fites:

| Tier                  | Descripció                                                   | On es guarda                 |
| --------------------- | ------------------------------------------------------------ | ---------------------------- |
| **Nodes individuals** | Completar un exercici concret (1min, 2min...)                | `localStorage` del navegador |
| **Fites de branca**   | Completar una branca sencera (Tabalemaster I, Corredor I...) | **Badge de Discourse**       |

Les fites excepcionals (tiers superiors) desbloquejaran branques noves i tindran badge i gràfic propis.

---

## Arquitectura tècnica

### Stack

| Component             | Tecnologia              | Motiu                                               |
| --------------------- | ----------------------- | --------------------------------------------------- |
| Arbre interactiu      | HTML + CSS + JS vanilla | Zero dependències, funciona en qualsevol dispositiu |
| Hosting               | GitHub Pages (gratuït)  | Senzill, fiable, control de versions                |
| Materials pesants     | Google Drive            | Gratuït, fàcil de gestionar                         |
| Autenticació i badges | Discourse (L'Ardada)    | Ja existent, API accessible                         |

### URL de producció

```
https://elawesomepanda.github.io/dolcaina-skill-tree
```

### Repositori GitHub

```
https://github.com/ElAwesomePanda/dolcaina-skill-tree
```

Fitxers al repo:

- `index.html` — l'arbre complet (HTML/CSS/JS en un sol fitxer)
- `.gitignore` — ignora `.DS_Store` i `Thumbs.db`

### Flux de desplegament

```
Editar index.html localment
        │
        ▼
git add . && git commit -m "..." && git push origin main
        │
        ▼
GitHub Pages actualitza automàticament en ~1 minut
```

---

## Integració amb Discourse (L'Ardada)

### Objectiu

Que el progrés dels alumnes es guarde de forma persistent i verificada, independent del dispositiu que facin servir.

### Estratègia de guardat en dos nivells

**Nivell 1 — localStorage (nodes individuals):**

- Ràpid, sense fricció, sense necessitat de login
- Es perd si canvia de dispositiu o esborra les cookies
- Adequat per a nodes de pràctica diària

**Nivell 2 — Discourse badges (fites de branca):**

- Persistent, verificat, independent del dispositiu
- L'alumne completa la branca → l'arbre el redirigeix a L'Ardada per reclamar el badge → moderador l'atorga → l'arbre consulta l'API i desbloqueja la branca

### API de Discourse

L'API de Discourse és accessible a:

```
https://ardada.discoursehosting.net/admin/api/keys
```

S'ha de crear una **API key** amb:

- Description: `dolcaina-skill-tree`
- User Level: `Single User` (usuari admin)
- Scope: `Global` (restringir posteriorment)

⚠️ **La API key NO ha d'estar mai al codi HTML de GitHub** — s'ha de gestionar de forma segura (per exemple, via un petit proxy o Cloudflare Worker).

### Endpoint per consultar badges d'un usuari

```
GET /user-badges/{username}.json
```

Exemple:

```
https://ardada.discoursehosting.net/user-badges/guillem.json
```

### Flux d'integració

```
Alumne completa branca sencera
        │
        ▼
L'arbre mostra: "Has guanyat Tabalemaster I! Ves a L'Ardada per reclamar-lo"
        │
        ▼
Alumne posta al topic corresponent de L'Ardada
        │
        ▼
Moderador atorga el badge manualment a Discourse
        │
        ▼
L'arbre consulta API → comprova badge → desbloqueja branca (sobreescriu localStorage)
```

---

## Accessibilitat i política d'accés

- L'arbre és **públic però no indexat** (`<meta name="robots" content="noindex, nofollow">`)
- L'enllaç el distribueix el professor als alumnes del taller
- No es requereix compte per veure l'arbre i navegar-lo
- Per reclamar badges i tenir progrés persistent → cal compte a **L'Ardada**
- Això serveix com a **ganxo natural** per portar tràfic i usuaris a Discourse

---

## Disseny visual

- Estètica RPG medieval/orgànica amb paleta daurada sobre fons fosc
- Tipografies: **Cinzel** (títols/etiquetes) + **Crimson Pro** (cos de text)
- Arbre vertical de **baix a dalt** (arrels → fulles)
- Cada node mostra: ID, títol, tags, badge amb SVG, estat (bloquejat/disponible/completat)
- Modal al fer clic: descripció, badge gran, llista de materials amb icones per tipus
- Barra de progrés general fixa a la capçalera

### Millores de disseny pendents

- [ ] Navegació: botó per anar a l'últim node desbloquejat
- [ ] Zoom in/out i pan per a arbres grans
- [ ] Capçalera i barra de progrés fixes en scroll
- [ ] Orientació baix→dalt (arrels a les fulles)
- [ ] Crèdit: _Desenvolupat per Guillem Reig_
- [ ] Fites excepcionals amb tiers visuals diferenciats

---

## Contingut de l'arbre (prototip actual)

### Branques implementades

```
[PL al beat]
    │
    ├─ PL·1min ──► PL·2min ──► PL·3min ──► PL·5min (Tabalemaster I)
    │                │
    │                └──► desbloqueja [D-E al beat]
    │
[D-E al beat]
    │
    ├─ DE·1min ──► DE·2min ──► DE·3min ──► DE·5min (Rapatam I)
                     │
                     ├──► desbloqueja [PL-D al beat]
                     └──► desbloqueja [PL-E al beat]

[PL-D al beat]                    [PL-E al beat]
PLD·1min ──► ... ──► PLD·5min     PLE·1min ──► ... ──► PLE·5min
(Corredor I)                      (Corredor II)
```

### Badges implementats

| Badge               | Node       | Tier       |
| ------------------- | ---------- | ---------- |
| Primer Pols         | PL·1min    | Node       |
| Pols Constant I     | PL·2min    | Node       |
| Pols Constant II    | PL·3min    | Node       |
| Tabalemaster I      | PL·5min    | **Branca** |
| Doble Impacte I-III | DE·1-3min  | Node       |
| Rapatam I           | DE·5min    | **Branca** |
| Combinació I-III    | PLD·1-3min | Node       |
| Corredor I          | PLD·5min   | **Branca** |
| Simetria I-III      | PLE·1-3min | Node       |
| Corredor II         | PLE·5min   | **Branca** |

---

## Pròxims passos (per ordre)

- [ ] Generar API key de Discourse
- [ ] Implementar consulta de badges via API (amb gestió segura de la key)
- [ ] Definir l'arbre complet (totes les branques i nodes reals)
- [ ] Afegir materials reals (PDFs i MP3s a Google Drive)
- [ ] Polir disseny (baix→dalt, zoom/pan, capçalera fixa, crèdit)
- [ ] Crear els badges reals a Discourse amb icones i descripcions
- [ ] Crear els topics de L'Ardada associats a cada fita de branca
- [ ] Provar el flux complet amb un alumne real

---

## Referències

- Repositori: https://github.com/ElAwesomePanda/dolcaina-skill-tree
- Producció: https://elawesomepanda.github.io/dolcaina-skill-tree
- L'Ardada (Discourse): https://ardada.discoursehosting.net
- API Discourse: https://ardada.discoursehosting.net/admin/api/keys
	- **Description:** `dolcaina-skill-tree`
	- **User Level:** `Single User`
	- **User:** el teu usuari admin
	- **Scope:** `Global` (de moment, després ho podem restringir)
	- Key: *(esborrada d'ací el 2026-09-10 — estava exposada en un repositori públic.
	  La clau en ús viu a `config.json`, que no està versionat. Vegeu `docs/MILLORES.md` M-01.)*
- Materials (Google Drive): per configurar