# Cloudflare Worker — `dolcaina-discourse-proxy`

Document de recreació del Worker que fa de pont entre l'arbre (GitHub Pages) i
l'API de Discourse (L'Ardada).

> ## ⚠️ Aquest Worker ja no és necessari
>
> **Verificat el 2026-09-10 amb `curl`.** Discourse ja envia els capçaleres CORS
> correctes i l'arbre pot cridar l'API directament. Vegeu §4.
>
> El Worker es manté desplegat com a xarxa de seguretat, però el pla és deixar de
> gastar-lo. **No hi invertisques temps en arreglar-lo.**

---

## 1. Per què existia

El navegador no pot fer `fetch` de `https://ardada.discoursehosting.net` des de
`https://elawesomepanda.github.io` si Discourse no ho autoritza explícitament
(política de *same-origin*). El Worker feia de pont: rebia la petició del
navegador, la reenviava a Discourse i tornava la resposta amb
`Access-Control-Allow-Origin: *`.

L'endpoint `/user-badges/{username}.json` de Discourse **és públic**: no gasta
cap API key. Per això el Worker no necessita cap credencial i no n'hi ha cap en
aquest directori.

## 2. Dades del desplegament

| Camp | Valor |
| --- | --- |
| Nom al tauler | `dolcaina-discourse-proxy` |
| URL activa | `https://dolcaina-discourse-proxy.guillem-reig-m.workers.dev` |
| Compte de Cloudflare | Personal de Guillem Reig (subdomini `guillem-reig-m`) |
| Pla | Free tier *(per confirmar al tauler)* |
| Variables d'entorn | Cap *(per confirmar a Settings → Variables)* |
| Domini propi | Cap, només el subdomini `.workers.dev` *(per confirmar a Settings → Triggers)* |
| Estat el 2026-09-10 | **Viu.** Respon `HTTP 200` amb `{badges, badge_types, granted_bies, user_badges}` |

Tauler: <https://dash.cloudflare.com> → Workers & Pages → `dolcaina-discourse-proxy`.

El codi desplegat està a [`worker.js`](worker.js), copiat verbatim.

## 3. Defectes coneguts del codi desplegat

Cap dels dos és urgent, perquè el Worker només arriba a contingut **públic** de
Discourse (no hi ha API key pel mig). Estan documentats perquè, si algun dia es
torna a desplegar, no es repetisquen.

### 3.1 Travessa de camins → proxy obert

`username` s'interpola a la URL sense validar ni codificar:

```js
`https://ardada.discoursehosting.net/user-badges/${username}.json`
```

Comprovat el 2026-09-10:

```
GET ...workers.dev?username=../../about   →  HTTP 200 amb el contingut de /about.json
```

O siga que el Worker serveix **qualsevol pàgina pública de Discourse** amb
`Access-Control-Allow-Origin: *`. Arreglat amb:

```js
if (!/^[\w.-]{1,60}$/.test(username ?? '')) {
  return new Response('{"error":"username invàlid"}', { status: 400 });
}
```

### 3.2 `Access-Control-Allow-Origin: *`

Qualsevol web pot cridar-lo. Hauria de ser
`https://elawesomepanda.github.io`.

### 3.3 Sense `username`, no falla

Amb el paràmetre absent fa `fetch` de `/user-badges/null.json`. Hauria de
tornar un 400.

## 4. Per què ja no cal — la comprovació

Communiteq va activar `enable_cors` i va afegir l'origin de GitHub Pages
(tiquet **#825876**). Comprovat amb `curl` el **2026-09-10**:

```
$ curl -D - -o /dev/null \
    -H "Origin: https://elawesomepanda.github.io" \
    https://ardada.discoursehosting.net/user-badges/greig.json

HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://elawesomepanda.github.io
Access-Control-Allow-Methods: POST, PUT, GET, OPTIONS, DELETE
Access-Control-Max-Age: 7200
```

El *preflight* (`OPTIONS`) també respon `200` amb els mateixos capçaleres.

**Detall important:** Discourse torna sempre el valor fix
`https://elawesomepanda.github.io`, siga quin siga l'`Origin` de la petició (o
fins i tot sense cap). Això vol dir que **només l'arbre pot cridar l'API des d'un
navegador**; qualsevol altra web rep un valor que no casa amb el seu origin i el
navegador li bloqueja la resposta. És el comportament que volem.

### Decisió del 2026-09-10: NO es canvia

El Worker funciona, la crida directa també, i canviar-ho ara seria arreglar
preventivament una cosa que no està trencada — a més de passar a dependre que
Communiteq no toque la configuració de CORS.

**El pla és deixar-ho com està i tindre documentat què fer si falla.** El que ve
a continuació és eixe pla, no una tasca pendent.

### Com llevar la dependència, si algun dia el Worker falla

A `index.html`, `syncDiscourse()`:

```js
// abans
const res = await fetch(`${PROXY_URL}?username=${input}`);

// després — i amb el username codificat, que ara no ho està
const res = await fetch(
  `${DISCOURSE_URL}/user-badges/${encodeURIComponent(input)}.json`
);
```

**No esborres el Worker de Cloudflare** en fer el canvi: és l'única eixida si el
problema resulta ser un altre. Al *free tier* no costa res tindre'l parat.

## 5. Com recrear-lo, si mai calguera

1. <https://dash.cloudflare.com>, amb el compte de Guillem Reig.
2. Workers & Pages → Create → Create Worker.
3. Nom: `dolcaina-discourse-proxy`.
4. Enganxa el contingut de [`worker.js`](worker.js) — **aplicant-hi abans els
   arreglaments de §3**.
5. Deploy.

La URL resultant serà `https://dolcaina-discourse-proxy.{subdomini}.workers.dev`.
Si el subdomini del compte ha canviat, actualitza la constant `PROXY_URL` a
`index.html`.

## 6. Diagnòstic

| Símptoma | Causa probable |
| --- | --- |
| «Error: usuari no trobat a L'Ardada» sempre | `syncDiscourse()` dona el mateix text per a qualsevol fallada. Prova el `curl` de §4 per a saber si és el servidor o el nom d'usuari |
| El `curl` funciona però el navegador no | Problema de CORS. Mira la pestanya Network amb el filtre d'errors |
| El Worker torna `500` | Discourse ha tornat alguna cosa que no és JSON (sol ser una pàgina d'error d'HTML) |
| Sincronitza però no desbloqueja res | No és el proxy: mira `discourse_badge_id` al CSV i `buildBadgeMap()` a `index.html` |
