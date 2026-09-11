// =============================================================================
// worker.js — dolcaina-discourse-proxy (Cloudflare Worker)
//
// AQUEST ES EL CODI TAL COM ESTA DESPLEGAT a data de 2026-09-10.
// Copiat verbatim perque el fitxer reflectisca la realitat, no el que voldriem.
//
// ATENCIO: aquest codi te dos defectes coneguts i **ja no es necessari**.
// Llig proxy/README.md abans de tocar-lo o de tornar a desplegar-lo.
// =============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    const discourseRes = await fetch(
      `https://ardada.discoursehosting.net/user-badges/${username}.json`
    );
    const data = await discourseRes.json();
    return new Response(JSON.stringify(data), {
      status: discourseRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
