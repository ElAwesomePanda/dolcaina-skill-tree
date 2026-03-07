// =============================================================================
// config.example.gs — Plantilla de configuració
// Copia aquest fitxer com a "config.gs" i omple els valors reals.
// config.gs està al .gitignore i MAI s'ha de pujar a GitHub.
// =============================================================================
const CONFIG = {
  // GitHub Personal Access Token (scope: public_repo)
  // Genera'l a: GitHub → Settings → Developer settings → Personal access tokens
  GITHUB_TOKEN:   'ghp_XXXXXXXXXXXXXXXXXX',
  GITHUB_OWNER:   'elawesomepanda',
  GITHUB_REPO:    'dolcaina-skill-tree',
  GITHUB_BRANCH:  'main',

  // Discourse API
  // Genera la clau a: Discourse Admin → API → New API Key (User Level: All Users o admin específic)
  DISCOURSE_API_KEY:      'XXXXXXXXXXXXXXXXXX',
  DISCOURSE_API_USERNAME: 'el_teu_username_admin',
  DISCOURSE_BASE_URL:     'https://ardada.discoursehosting.net',
  // ID de la categoria: últim número de la URL de la categoria
  // Ex: /c/ateneu/tallers-gaita-tabalet/17 → 17
  DISCOURSE_CATEGORY_ID:  17,
};
