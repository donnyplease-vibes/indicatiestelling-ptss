// ============================================================
// PTSS Onderzoeksmonitor — app.js
// ============================================================

const CLUSTERS = [
  {
    id: 'differential',
    label: 'Differentiële effectiviteit',
    shortLabel: 'Diff. effect.',
    queries: [
      'PTSD treatment moderators',
      'differential effectiveness trauma-focused therapy',
      'PTSD personalized treatment'
    ]
  },
  {
    id: 'comorbidity',
    label: 'Comorbiditeit & contra-indicaties',
    shortLabel: 'Comorbiditeit',
    queries: [
      'PTSD comorbidity treatment outcome',
      'complex PTSD psychotherapy',
      'PTSD dissociation BPD suicidality treatment'
    ]
  },
  {
    id: 'clinical',
    label: 'Indicatiestelling & klinische besluitvorming',
    shortLabel: 'Indicatiestelling',
    queries: [
      'PTSD clinical decision making treatment selection',
      'clinician barriers trauma-focused therapy',
      'PTSD treatment preferences'
    ]
  },
  {
    id: 'acceptability',
    label: 'Acceptability & adverse effects',
    shortLabel: 'Acceptability',
    queries: [
      'PTSD treatment dropout acceptability',
      'trauma-focused therapy adverse effects deterioration'
    ]
  },
  {
    id: 'epidemiology',
    label: 'Epidemiologie',
    shortLabel: 'Epidemiologie',
    queries: [
      'PTSD prevalence incidence Europe',
      'trauma exposure undertreatment help-seeking'
    ]
  },
  {
    id: 'guideline',
    label: 'Richtlijn-praktijk gap',
    shortLabel: 'Richtlijn gap',
    queries: [
      'PTSD guideline implementation treatment gap',
      'evidence-practice gap trauma-focused therapy'
    ]
  }
];

// ---- State ----
let allArticles = [];   // { id, title, authors, journal, year, doi, source, cluster, citations, isNew, query }
let readSet = new Set();
let savedSet = new Set();
let currentCluster = 'all';
let currentFilter = 'all';  // all | new | saved
let isSearching = false;
let deferredInstall = null;

// ---- LocalStorage keys ----
const LS_LAST_SEARCH = 'ptss_last_search';
const LS_ARTICLES    = 'ptss_articles';
const LS_READ        = 'ptss_read';
const LS_SAVED       = 'ptss_saved';

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  registerSW();
  loadState();
  renderTabs();
  renderFilterBar();
  renderArticles();
  updateStatusBar();
  setupInstallPrompt();
  checkAutoSearch();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_ARTICLES);
    allArticles = raw ? JSON.parse(raw) : [];
    const rawRead = localStorage.getItem(LS_READ);
    readSet = new Set(rawRead ? JSON.parse(rawRead) : []);
    const rawSaved = localStorage.getItem(LS_SAVED);
    savedSet = new Set(rawSaved ? JSON.parse(rawSaved) : []);
  } catch(e) {
    allArticles = [];
  }
}

function saveState() {
  try {
    localStorage.setItem(LS_ARTICLES, JSON.stringify(allArticles));
    localStorage.setItem(LS_READ, JSON.stringify([...readSet]));
    localStorage.setItem(LS_SAVED, JSON.stringify([...savedSet]));
  } catch(e) {
    console.warn('localStorage full?', e);
  }
}

function getLastSearch() {
  return localStorage.getItem(LS_LAST_SEARCH) || null;
}

function setLastSearch(date) {
  localStorage.setItem(LS_LAST_SEARCH, date);
}

function checkAutoSearch() {
  const last = getLastSearch();
  if (!last) return; // First run — wait for user
  const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 86400);
  if (daysSince >= 30) {
    showToast('Maandelijkse update beschikbaar — druk op Zoeken');
  }
}

// ---- Deduplication ----
function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function articleId(article) {
  if (article.doi) return 'doi:' + article.doi.toLowerCase().replace(/https?:\/\/doi\.org\//i, '');
  return 'title:' + normalizeTitle(article.title);
}

function deduplicateArticles(existing, incoming) {
  const seen = new Map();
  for (const a of existing) seen.set(articleId(a), a);

  const added = [];
  for (const a of incoming) {
    const id = articleId(a);
    if (!seen.has(id)) {
      seen.set(id, a);
      added.push(a);
    }
  }
  return { merged: [...seen.values()], added };
}

// ---- API calls ----
async function searchPubMed(query, fromDate) {
  const dateFilter = fromDate ? `&mindate=${fromDate}&maxdate=3000/01/01&datetype=pdat` : '';
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=50&retmode=json${dateFilter}`;

  try {
    const searchResp = await fetch(searchUrl);
    if (!searchResp.ok) throw new Error('PubMed search failed');
    const searchData = await searchResp.json();
    const ids = searchData.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryResp = await fetch(summaryUrl);
    if (!summaryResp.ok) return [];
    const summaryData = await summaryResp.json();
    const result = summaryData.result || {};
    const uids = result.uids || ids;

    return uids.map(uid => {
      const item = result[uid];
      if (!item) return null;
      const doi = (item.articleids || []).find(a => a.idtype === 'doi')?.value || null;
      const authors = (item.authors || []).slice(0, 3).map(a => a.name).join(', ');
      const extra = item.authors?.length > 3 ? ' et al.' : '';
      return {
        title: item.title || '',
        authors: authors + extra,
        journal: item.source || '',
        year: (item.pubdate || '').split(' ')[0] || '',
        doi: doi,
        source: 'PubMed',
        citations: null,
        pmid: uid
      };
    }).filter(Boolean);
  } catch(e) {
    console.warn('PubMed error:', e);
    return [];
  }
}

async function searchSemanticScholar(query, fromDate) {
  const yearFilter = fromDate ? `&year=${new Date(fromDate).getFullYear()}-` : '';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,externalIds,citationCount,journal,venue&limit=50${yearFilter}`;

  try {
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('Semantic Scholar failed');
    const data = await resp.json();
    const papers = data.data || [];

    return papers.map(p => {
      const doi = p.externalIds?.DOI || null;
      const authors = (p.authors || []).slice(0, 3).map(a => a.name).join(', ');
      const extra = (p.authors || []).length > 3 ? ' et al.' : '';
      return {
        title: p.title || '',
        authors: authors + extra,
        journal: p.journal?.name || p.venue || '',
        year: String(p.year || ''),
        doi: doi,
        source: 'Semantic Scholar',
        citations: p.citationCount ?? null,
        ssId: p.paperId
      };
    }).filter(p => p.title);
  } catch(e) {
    console.warn('Semantic Scholar error:', e);
    return [];
  }
}

async function searchOpenAlex(query, fromDate) {
  const dateFilter = fromDate ? `,from_publication_date:${fromDate}` : '';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=type:article${dateFilter}&per-page=50&select=id,title,authorships,publication_year,doi,primary_location,cited_by_count&mailto=ptss-monitor@example.com`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('OpenAlex failed');
    const data = await resp.json();
    const works = data.results || [];

    return works.map(w => {
      const doi = w.doi ? w.doi.replace('https://doi.org/', '') : null;
      const auths = (w.authorships || []).slice(0, 3).map(a => a.author?.display_name || '').filter(Boolean).join(', ');
      const extra = (w.authorships || []).length > 3 ? ' et al.' : '';
      const journal = w.primary_location?.source?.display_name || '';
      return {
        title: w.title || '',
        authors: auths + extra,
        journal: journal,
        year: String(w.publication_year || ''),
        doi: doi,
        source: 'OpenAlex',
        citations: w.cited_by_count ?? null,
        openalexId: w.id
      };
    }).filter(p => p.title);
  } catch(e) {
    console.warn('OpenAlex error:', e);
    return [];
  }
}

// ---- Main search ----
async function runSearch() {
  if (isSearching) return;
  isSearching = true;
  document.getElementById('search-btn').disabled = true;
  document.getElementById('progress-overlay').classList.add('visible');
  updateStatus('searching', 'Bezig met zoeken...');

  const fromDate = getLastSearch();
  const today = new Date().toISOString().split('T')[0];
  let newArticles = [];
  let total = CLUSTERS.reduce((s, c) => s + c.queries.length, 0);
  let done = 0;

  for (const cluster of CLUSTERS) {
    for (const query of cluster.queries) {
      updateProgress(`${cluster.shortLabel}: "${query.substring(0, 30)}..."`);

      const [pubmed, semantic, openalex] = await Promise.all([
        searchPubMed(query, fromDate),
        searchSemanticScholar(query, fromDate),
        searchOpenAlex(query, fromDate)
      ]);

      const batch = [...pubmed, ...semantic, ...openalex].map(a => ({
        ...a,
        cluster: cluster.id,
        query: query,
        isNew: true
      }));

      newArticles = newArticles.concat(batch);
      done++;
      updateProgress(`Cluster ${done}/${total} voltooid`);
      // Small delay to be polite to APIs
      await sleep(300);
    }
  }

  // Mark existing articles as not new
  const withoutNew = allArticles.map(a => ({ ...a, isNew: false }));
  const { merged, added } = deduplicateArticles(withoutNew, newArticles);

  allArticles = merged;
  saveState();
  setLastSearch(today);

  isSearching = false;
  document.getElementById('search-btn').disabled = false;
  document.getElementById('progress-overlay').classList.remove('visible');

  updateStatusBar();
  renderTabs();
  renderArticles();

  const msg = added.length > 0
    ? `${added.length} nieuwe artikel${added.length === 1 ? '' : 'en'} gevonden!`
    : 'Geen nieuwe artikelen gevonden.';
  updateStatus('active', msg);
  showToast(msg);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Render functions ----
function renderTabs() {
  const bar = document.getElementById('tab-bar');
  const counts = countByCluster();

  const tabs = [
    { id: 'all', label: 'Alle', shortLabel: 'Alle' },
    ...CLUSTERS
  ];

  bar.innerHTML = tabs.map(cluster => {
    const count = cluster.id === 'all'
      ? allArticles.length
      : (counts[cluster.id] || 0);
    const newCount = cluster.id === 'all'
      ? allArticles.filter(a => a.isNew).length
      : allArticles.filter(a => a.cluster === cluster.id && a.isNew).length;
    const isActive = currentCluster === cluster.id;
    const badgeClass = newCount > 0 ? 'badge new' : 'badge';
    const badge = count > 0 ? `<span class="${badgeClass}">${newCount > 0 ? newCount : count}</span>` : '';
    return `<button class="tab-btn${isActive ? ' active' : ''}" onclick="selectCluster('${cluster.id}')">${cluster.shortLabel || cluster.label}${badge}</button>`;
  }).join('');
}

function countByCluster() {
  const c = {};
  for (const a of allArticles) {
    c[a.cluster] = (c[a.cluster] || 0) + 1;
  }
  return c;
}

function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  const filters = [
    { id: 'all', label: 'Alles' },
    { id: 'new', label: 'Nieuw' },
    { id: 'saved', label: 'Opgeslagen' },
    { id: 'unread', label: 'Ongelezen' }
  ];
  const countLabel = `<span class="count-label" id="article-count"></span>`;
  bar.innerHTML = filters.map(f =>
    `<button class="filter-btn${currentFilter === f.id ? ' active' : ''}" onclick="selectFilter('${f.id}')">${f.label}</button>`
  ).join('') + countLabel;
}

function getFilteredArticles() {
  let articles = currentCluster === 'all'
    ? allArticles
    : allArticles.filter(a => a.cluster === currentCluster);

  if (currentFilter === 'new') articles = articles.filter(a => a.isNew);
  else if (currentFilter === 'saved') articles = articles.filter(a => savedSet.has(articleId(a)));
  else if (currentFilter === 'unread') articles = articles.filter(a => !readSet.has(articleId(a)));

  // Sort: new first, then by year desc
  return articles.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    return (b.year || '0').localeCompare(a.year || '0');
  });
}

function renderArticles() {
  const container = document.getElementById('articles-container');
  const filtered = getFilteredArticles();

  // Update count
  const countEl = document.getElementById('article-count');
  if (countEl) countEl.textContent = `${filtered.length} artikel${filtered.length === 1 ? '' : 'en'}`;

  if (allArticles.length === 0) {
    container.innerHTML = `
      <div class="state-card">
        <h3>Nog geen resultaten</h3>
        <p>Druk op <strong>Zoeken</strong> om de databases te doorzoeken op publicaties over PTSS-behandelindicatie.</p>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="state-card">
        <h3>Geen artikelen gevonden</h3>
        <p>Er zijn geen artikelen die aan dit filter voldoen.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(a => renderCard(a)).join('');
}

function renderCard(article) {
  const id = articleId(article);
  const isRead = readSet.has(id);
  const isSaved = savedSet.has(id);
  const classes = [
    'article-card',
    isRead ? 'is-read' : '',
    isSaved ? 'is-saved' : '',
    article.isNew ? 'is-new' : ''
  ].filter(Boolean).join(' ');

  const titleHtml = article.doi
    ? `<a href="https://doi.org/${article.doi}" target="_blank" rel="noopener">${escHtml(article.title)}</a>`
    : escHtml(article.title);

  const sourceTag = `<span class="tag tag-${article.source.toLowerCase().replace(' ', '')}">${escHtml(article.source)}</span>`;
  const yearTag = article.year ? `<span class="tag tag-year">${escHtml(article.year)}</span>` : '';
  const citTag = article.citations != null ? `<span class="tag tag-citations">${article.citations} citaties</span>` : '';

  const cluster = CLUSTERS.find(c => c.id === article.cluster);
  const clusterLabel = cluster ? `<small style="color:var(--text-muted); font-size:11px; display:block; margin-bottom:5px;">${escHtml(cluster.shortLabel)}</small>` : '';

  const readLabel = isRead ? 'Gelezen ✓' : 'Markeer gelezen';
  const saveLabel = isSaved ? 'Opgeslagen ★' : 'Opslaan';
  const readClass = isRead ? 'action-btn active-read' : 'action-btn';
  const saveClass = isSaved ? 'action-btn active-save' : 'action-btn';

  const safeId = escHtml(id);

  return `
<div class="${classes}" data-id="${safeId}">
  ${clusterLabel}
  <div class="article-title">${titleHtml}</div>
  <div class="article-meta">${escHtml(article.authors || '')}${article.authors && article.journal ? ' · ' : ''}${escHtml(article.journal || '')}</div>
  <div class="article-tags">${sourceTag}${yearTag}${citTag}</div>
  <div class="article-actions">
    <button class="${readClass}" onclick="toggleRead('${safeId}')">${readLabel}</button>
    <button class="${saveClass}" onclick="toggleSave('${safeId}')">${saveLabel}</button>
  </div>
</div>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Actions ----
function selectCluster(id) {
  currentCluster = id;
  renderTabs();
  renderArticles();
  window.scrollTo(0, 0);
}

function selectFilter(id) {
  currentFilter = id;
  renderFilterBar();
  renderArticles();
}

function toggleRead(id) {
  if (readSet.has(id)) readSet.delete(id);
  else readSet.add(id);
  saveState();
  renderArticles();
}

function toggleSave(id) {
  if (savedSet.has(id)) savedSet.delete(id);
  else savedSet.add(id);
  saveState();
  renderArticles();
}

// ---- Status bar ----
function updateStatusBar() {
  const last = getLastSearch();
  const total = allArticles.length;
  const newCount = allArticles.filter(a => a.isNew).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-new').textContent = newCount;

  const lastEl = document.getElementById('last-search');
  if (last) {
    const d = new Date(last);
    lastEl.textContent = `Laatste zoekopdracht: ${d.toLocaleDateString('nl-NL')}`;
  } else {
    lastEl.textContent = 'Nog niet gezocht';
  }

  updateStatus('active', last ? `${total} artikelen geladen` : 'Druk op Zoeken om te beginnen');
}

function updateStatus(type, message) {
  const dot = document.getElementById('status-dot');
  const msg = document.getElementById('status-msg');
  dot.className = 'dot ' + type;
  msg.textContent = message;
}

function updateProgress(msg) {
  document.getElementById('progress-text').textContent = msg;
}

// ---- Toast ----
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---- Install prompt ----
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    document.getElementById('install-btn').classList.add('visible');
  });

  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    const result = await deferredInstall.userChoice;
    if (result.outcome === 'accepted') {
      document.getElementById('install-btn').classList.remove('visible');
      showToast('App geïnstalleerd!');
    }
    deferredInstall = null;
  });
}

// ---- Global expose ----
window.selectCluster = selectCluster;
window.selectFilter = selectFilter;
window.toggleRead = toggleRead;
window.toggleSave = toggleSave;
window.runSearch = runSearch;
