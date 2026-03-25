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
let allArticles = [];
let readSet = new Set();
let savedSet = new Set();
let excludedSet = new Set();   // normalized DOIs/titles of library articles
let abstractCache = {};        // articleId -> abstract text (or null = unavailable)
let currentCluster = 'all';
let currentFilter = 'all';    // all | new | saved | unread | excluded
let isSearching = false;
let deferredInstall = null;

// ---- LocalStorage keys ----
const LS_LAST_SEARCH = 'ptss_last_search';
const LS_ARTICLES    = 'ptss_articles';
const LS_READ        = 'ptss_read';
const LS_SAVED       = 'ptss_saved';
const LS_EXCLUDED    = 'ptss_excluded';
const LS_ABSTRACTS   = 'ptss_abstracts';

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
    readSet   = new Set(JSON.parse(localStorage.getItem(LS_READ)   || '[]'));
    savedSet  = new Set(JSON.parse(localStorage.getItem(LS_SAVED)  || '[]'));
    excludedSet = new Set(JSON.parse(localStorage.getItem(LS_EXCLUDED) || '[]'));
    abstractCache = JSON.parse(localStorage.getItem(LS_ABSTRACTS) || '{}');
  } catch(e) {
    allArticles = [];
  }
}

function saveState() {
  try {
    localStorage.setItem(LS_ARTICLES,  JSON.stringify(allArticles));
    localStorage.setItem(LS_READ,      JSON.stringify([...readSet]));
    localStorage.setItem(LS_SAVED,     JSON.stringify([...savedSet]));
    localStorage.setItem(LS_EXCLUDED,  JSON.stringify([...excludedSet]));
    localStorage.setItem(LS_ABSTRACTS, JSON.stringify(abstractCache));
  } catch(e) {
    console.warn('localStorage full?', e);
  }
}

function getLastSearch() { return localStorage.getItem(LS_LAST_SEARCH) || null; }
function setLastSearch(d) { localStorage.setItem(LS_LAST_SEARCH, d); }

function checkAutoSearch() {
  const last = getLastSearch();
  if (!last) return;
  const days = (Date.now() - new Date(last).getTime()) / (1000 * 86400);
  if (days >= 30) showToast('Maandelijkse update beschikbaar — druk op Zoeken');
}

// ---- Deduplication & ID ----
function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeDoi(doi) {
  return (doi || '').toLowerCase()
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();
}

function articleId(article) {
  if (article.doi) return 'doi:' + normalizeDoi(article.doi);
  return 'title:' + normalizeTitle(article.title);
}

function isExcluded(article) {
  const id = articleId(article);
  // Check exact ID match
  if (excludedSet.has(id)) return true;
  // Also check by raw DOI (in case format differs)
  if (article.doi) {
    const d = normalizeDoi(article.doi);
    if (excludedSet.has('doi:' + d)) return true;
  }
  // Check normalized title match
  const nt = 'title:' + normalizeTitle(article.title);
  if (excludedSet.has(nt)) return true;
  return false;
}

function deduplicateArticles(existing, incoming) {
  const seen = new Map();
  for (const a of existing) seen.set(articleId(a), a);
  const added = [];
  for (const a of incoming) {
    const id = articleId(a);
    if (!seen.has(id)) { seen.set(id, a); added.push(a); }
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
      const extra = (item.authors || []).length > 3 ? ' et al.' : '';
      return {
        title: item.title || '',
        authors: authors + extra,
        journal: item.source || '',
        year: (item.pubdate || '').split(' ')[0] || '',
        doi, source: 'PubMed', citations: null, pmid: uid, abstract: null
      };
    }).filter(Boolean);
  } catch(e) {
    console.warn('PubMed error:', e);
    return [];
  }
}

async function searchSemanticScholar(query, fromDate) {
  const yearFilter = fromDate ? `&year=${new Date(fromDate).getFullYear()}-` : '';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,externalIds,citationCount,journal,venue,abstract&limit=50${yearFilter}`;
  try {
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('Semantic Scholar failed');
    const data = await resp.json();
    return (data.data || []).map(p => {
      const doi = p.externalIds?.DOI || null;
      const authors = (p.authors || []).slice(0, 3).map(a => a.name).join(', ');
      const extra = (p.authors || []).length > 3 ? ' et al.' : '';
      return {
        title: p.title || '',
        authors: authors + extra,
        journal: p.journal?.name || p.venue || '',
        year: String(p.year || ''),
        doi, source: 'Semantic Scholar',
        citations: p.citationCount ?? null,
        ssId: p.paperId,
        abstract: p.abstract || null
      };
    }).filter(p => p.title);
  } catch(e) {
    console.warn('Semantic Scholar error:', e);
    return [];
  }
}

function reconstructOpenAlexAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const entries = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) entries.push([pos, word]);
  }
  if (!entries.length) return null;
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map(e => e[1]).join(' ');
}

async function searchOpenAlex(query, fromDate) {
  const dateFilter = fromDate ? `,from_publication_date:${fromDate}` : '';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=type:article${dateFilter}&per-page=50&select=id,title,authorships,publication_year,doi,primary_location,cited_by_count,abstract_inverted_index&mailto=ptss-monitor@example.com`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('OpenAlex failed');
    const data = await resp.json();
    return (data.results || []).map(w => {
      const doi = w.doi ? w.doi.replace('https://doi.org/', '') : null;
      const auths = (w.authorships || []).slice(0, 3).map(a => a.author?.display_name || '').filter(Boolean).join(', ');
      const extra = (w.authorships || []).length > 3 ? ' et al.' : '';
      const journal = w.primary_location?.source?.display_name || '';
      return {
        title: w.title || '',
        authors: auths + extra,
        journal, year: String(w.publication_year || ''),
        doi, source: 'OpenAlex',
        citations: w.cited_by_count ?? null,
        openalexId: w.id,
        abstract: reconstructOpenAlexAbstract(w.abstract_inverted_index)
      };
    }).filter(p => p.title);
  } catch(e) {
    console.warn('OpenAlex error:', e);
    return [];
  }
}

// Fetch PubMed abstract on demand (not available in esummary)
async function fetchPubMedAbstract(pmid) {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const xml = await resp.text();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const nodes = doc.querySelectorAll('AbstractText');
    if (!nodes.length) return null;
    return Array.from(nodes).map(el => {
      const label = el.getAttribute('Label');
      return label ? `${label}: ${el.textContent}` : el.textContent;
    }).join('\n\n');
  } catch(e) {
    return null;
  }
}

// ---- Abstract toggle ----
async function toggleAbstract(artIdx) {
  const container = document.getElementById('articles-container');
  const cards = container.querySelectorAll('.article-card');
  const card = cards[artIdx];
  if (!card) return;

  const body = card.querySelector('.abstract-body');
  const btn  = card.querySelector('.abstract-btn');
  if (!body || !btn) return;

  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open');
    btn.textContent = 'Abstract ▼';
    return;
  }

  body.classList.add('open');
  btn.textContent = 'Abstract ▲';

  const artId = card.dataset.id;
  if (artId in abstractCache) {
    body.innerHTML = abstractCache[artId]
      ? `<p>${escHtml(abstractCache[artId])}</p>`
      : '<p class="no-abstract">Geen abstract beschikbaar.</p>';
    return;
  }

  body.innerHTML = '<div class="abs-spinner"></div>';
  const article = allArticles.find(a => articleId(a) === artId);
  let text = null;

  if (article) {
    // Use stored abstract if available
    if (article.abstract) {
      text = article.abstract;
    } else if (article.pmid) {
      text = await fetchPubMedAbstract(article.pmid);
    } else if (article.ssId) {
      // Fetch from Semantic Scholar if missed
      try {
        const r = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${article.ssId}?fields=abstract`);
        if (r.ok) { const d = await r.json(); text = d.abstract || null; }
      } catch(e) {}
    }
  }

  abstractCache[artId] = text;
  saveState();

  body.innerHTML = text
    ? `<p>${escHtml(text)}</p>`
    : '<p class="no-abstract">Geen abstract beschikbaar.</p>';
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
  const total = CLUSTERS.reduce((s, c) => s + c.queries.length, 0);
  let done = 0;

  for (const cluster of CLUSTERS) {
    for (const query of cluster.queries) {
      updateProgress(`${cluster.shortLabel}: "${query.substring(0, 30)}…"`);
      const [pubmed, semantic, openalex] = await Promise.all([
        searchPubMed(query, fromDate),
        searchSemanticScholar(query, fromDate),
        searchOpenAlex(query, fromDate)
      ]);
      const batch = [...pubmed, ...semantic, ...openalex].map(a => ({
        ...a, cluster: cluster.id, query, isNew: true
      }));
      newArticles = newArticles.concat(batch);
      done++;
      updateProgress(`${done}/${total} queries voltooid`);
      await sleep(300);
    }
  }

  // Cache abstracts that came in with the batch
  for (const a of newArticles) {
    if (a.abstract) {
      const id = articleId(a);
      if (!(id in abstractCache)) abstractCache[id] = a.abstract;
    }
  }

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

  const visible = added.filter(a => !isExcluded(a));
  const msg = visible.length > 0
    ? `${visible.length} nieuwe artikel${visible.length === 1 ? '' : 'en'} gevonden!`
    : 'Geen nieuwe artikelen gevonden.';
  updateStatus('active', msg);
  showToast(msg);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Render functions ----
function renderTabs() {
  const bar = document.getElementById('tab-bar');
  const counts = countByCluster();
  const tabs = [{ id: 'all', label: 'Alle', shortLabel: 'Alle' }, ...CLUSTERS];

  bar.innerHTML = tabs.map(cluster => {
    const total = cluster.id === 'all'
      ? allArticles.filter(a => !isExcluded(a)).length
      : (counts[cluster.id] || 0);
    const newCount = cluster.id === 'all'
      ? allArticles.filter(a => a.isNew && !isExcluded(a)).length
      : allArticles.filter(a => a.cluster === cluster.id && a.isNew && !isExcluded(a)).length;
    const isActive = currentCluster === cluster.id;
    const badgeClass = newCount > 0 ? 'badge new' : 'badge';
    const badge = total > 0 ? `<span class="${badgeClass}">${newCount > 0 ? newCount : total}</span>` : '';
    return `<button class="tab-btn${isActive ? ' active' : ''}" onclick="selectCluster('${cluster.id}')">${cluster.shortLabel || cluster.label}${badge}</button>`;
  }).join('');
}

function countByCluster() {
  const c = {};
  for (const a of allArticles) {
    if (!isExcluded(a)) c[a.cluster] = (c[a.cluster] || 0) + 1;
  }
  return c;
}

function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  const excludedCount = allArticles.filter(a => isExcluded(a)).length;
  const filters = [
    { id: 'all',      label: 'Alles' },
    { id: 'new',      label: 'Nieuw' },
    { id: 'saved',    label: 'Opgeslagen' },
    { id: 'unread',   label: 'Ongelezen' },
    { id: 'excluded', label: `Uitgesloten${excludedCount ? ' (' + excludedCount + ')' : ''}` }
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

  if (currentFilter === 'excluded') {
    articles = articles.filter(a => isExcluded(a));
  } else {
    // All non-excluded views hide excluded articles
    articles = articles.filter(a => !isExcluded(a));
    if (currentFilter === 'new')    articles = articles.filter(a => a.isNew);
    else if (currentFilter === 'saved')  articles = articles.filter(a => savedSet.has(articleId(a)));
    else if (currentFilter === 'unread') articles = articles.filter(a => !readSet.has(articleId(a)));
  }

  return articles.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    return (b.year || '0').localeCompare(a.year || '0');
  });
}

function renderArticles() {
  const container = document.getElementById('articles-container');
  const filtered = getFilteredArticles();

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

  container.innerHTML = filtered.map((a, i) => renderCard(a, i)).join('');
}

function renderCard(article, idx) {
  const id = articleId(article);
  const isRead = readSet.has(id);
  const isSaved = savedSet.has(id);
  const excluded = isExcluded(article);
  const classes = [
    'article-card',
    isRead ? 'is-read' : '',
    isSaved ? 'is-saved' : '',
    article.isNew ? 'is-new' : '',
    excluded ? 'is-excluded' : ''
  ].filter(Boolean).join(' ');

  const titleHtml = article.doi
    ? `<a href="https://doi.org/${article.doi}" target="_blank" rel="noopener">${escHtml(article.title)}</a>`
    : escHtml(article.title);

  const sourceKey = article.source.toLowerCase().replace(/\s/g, '');
  const sourceTag = `<span class="tag tag-${sourceKey}">${escHtml(article.source)}</span>`;
  const yearTag   = article.year ? `<span class="tag tag-year">${escHtml(article.year)}</span>` : '';
  const citTag    = article.citations != null ? `<span class="tag tag-citations">${article.citations} cit.</span>` : '';

  const cluster = CLUSTERS.find(c => c.id === article.cluster);
  const clusterLabel = cluster
    ? `<small class="cluster-label">${escHtml(cluster.shortLabel)}</small>`
    : '';

  const readLabel  = isRead  ? 'Gelezen ✓'   : 'Markeer gelezen';
  const saveLabel  = isSaved ? 'Opgeslagen ★' : 'Opslaan';
  const readClass  = isRead  ? 'action-btn active-read' : 'action-btn';
  const saveClass  = isSaved ? 'action-btn active-save' : 'action-btn';

  const safeId = escAttr(id);

  const excludeBtn = excluded
    ? `<button class="action-btn active-excluded" onclick="removeExclude('${safeId}')">Uitgesloten ✕</button>`
    : `<button class="action-btn" onclick="addExclude('${safeId}')">Uitsluiten</button>`;

  // Stored abstract indicator
  const hasAbstract = (abstractCache[id] != null && abstractCache[id] !== '');
  const absLabel = hasAbstract ? 'Abstract ▼' : 'Abstract ▼';

  return `
<div class="${classes}" data-id="${safeId}" data-idx="${idx}">
  ${clusterLabel}
  <div class="article-title">${titleHtml}</div>
  <div class="article-meta">${escHtml(article.authors || '')}${article.authors && article.journal ? ' · ' : ''}${escHtml(article.journal || '')}</div>
  <div class="article-tags">${sourceTag}${yearTag}${citTag}</div>
  <div class="article-actions">
    <button class="${readClass}" onclick="toggleRead('${safeId}')">${readLabel}</button>
    <button class="${saveClass}" onclick="toggleSave('${safeId}')">${saveLabel}</button>
    <button class="action-btn abstract-btn" onclick="toggleAbstract(${idx})">${absLabel}</button>
    ${excludeBtn}
  </div>
  <div class="abstract-body"></div>
</div>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
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
  if (readSet.has(id)) readSet.delete(id); else readSet.add(id);
  saveState();
  renderArticles();
}

function toggleSave(id) {
  if (savedSet.has(id)) savedSet.delete(id); else savedSet.add(id);
  saveState();
  renderArticles();
}

function addExclude(id) {
  excludedSet.add(id);
  saveState();
  renderFilterBar();
  renderTabs();
  renderArticles();
  updateStatusBar();
}

function removeExclude(id) {
  excludedSet.delete(id);
  saveState();
  renderFilterBar();
  renderTabs();
  renderArticles();
  updateStatusBar();
}

// ---- Library exclusion modal ----
function openLibraryModal() {
  document.getElementById('library-modal').classList.add('open');
  updateLibraryStats();
}

function closeLibraryModal() {
  document.getElementById('library-modal').classList.remove('open');
}

function updateLibraryStats() {
  const count = excludedSet.size;
  const matched = allArticles.filter(a => isExcluded(a)).length;
  document.getElementById('library-stats').textContent =
    `${count} items in bibliotheek · ${matched} artikel${matched === 1 ? '' : 'en'} uitgesloten uit resultaten`;
}

function parseLibraryText(text) {
  const ids = new Set();

  // BibTeX: doi = {10.xxx/xxx}
  for (const m of text.matchAll(/\bdoi\s*=\s*[\{"']([^}"'\s]+)[\}"']/gi)) {
    ids.add('doi:' + normalizeDoi(m[1]));
  }

  // RIS format: DO  - 10.xxx/xxx
  for (const m of text.matchAll(/^DO\s+-\s+(.+)$/gm)) {
    ids.add('doi:' + normalizeDoi(m[1].trim()));
  }

  // Bare DOIs (10.xxxx/xxx)
  for (const m of text.matchAll(/\b(10\.\d{4,}\/[^\s,;"'<>\]]+)/g)) {
    ids.add('doi:' + normalizeDoi(m[1]));
  }

  // https://doi.org/... URLs
  for (const m of text.matchAll(/https?:\/\/doi\.org\/([^\s,;"'<>\]]+)/gi)) {
    ids.add('doi:' + normalizeDoi(m[1]));
  }

  // BibTeX titles: title = {Some Title}
  for (const m of text.matchAll(/\btitle\s*=\s*\{([^}]{10,})\}/gi)) {
    ids.add('title:' + normalizeTitle(m[1]));
  }

  // RIS titles: TI  - Some Title or T1  - Some Title
  for (const m of text.matchAll(/^(?:TI|T1)\s+-\s+(.{10,})$/gm)) {
    ids.add('title:' + normalizeTitle(m[1].trim()));
  }

  return ids;
}

function saveLibraryList() {
  const text = document.getElementById('library-textarea').value;
  const parsed = parseLibraryText(text);
  if (parsed.size === 0) {
    showToast('Geen DOIs of titels herkend in de tekst.');
    return;
  }

  for (const id of parsed) excludedSet.add(id);
  saveState();
  updateLibraryStats();
  renderFilterBar();
  renderTabs();
  renderArticles();
  updateStatusBar();

  const matched = allArticles.filter(a => isExcluded(a)).length;
  showToast(`${parsed.size} referenties ingeladen · ${matched} artikelen uitgesloten`);
  document.getElementById('library-textarea').value = '';
}

function clearLibraryList() {
  if (!confirm(`Weet je zeker dat je alle ${excludedSet.size} bibliotheek-items wilt verwijderen?`)) return;
  excludedSet.clear();
  saveState();
  updateLibraryStats();
  renderFilterBar();
  renderTabs();
  renderArticles();
  updateStatusBar();
  showToast('Bibliotheek geleegd.');
}

// ---- Status bar ----
function updateStatusBar() {
  const last = getLastSearch();
  const total = allArticles.filter(a => !isExcluded(a)).length;
  const newCount = allArticles.filter(a => a.isNew && !isExcluded(a)).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-new').textContent = newCount;

  const lastEl = document.getElementById('last-search');
  lastEl.textContent = last
    ? `Laatste zoekopdracht: ${new Date(last).toLocaleDateString('nl-NL')}`
    : 'Nog niet gezocht';

  updateStatus('active', last ? `${total} artikelen geladen` : 'Druk op Zoeken om te beginnen');
}

function updateStatus(type, message) {
  document.getElementById('status-dot').className = 'dot ' + type;
  document.getElementById('status-msg').textContent = message;
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
window.selectCluster   = selectCluster;
window.selectFilter    = selectFilter;
window.toggleRead      = toggleRead;
window.toggleSave      = toggleSave;
window.toggleAbstract  = toggleAbstract;
window.addExclude      = addExclude;
window.removeExclude   = removeExclude;
window.openLibraryModal  = openLibraryModal;
window.closeLibraryModal = closeLibraryModal;
window.saveLibraryList   = saveLibraryList;
window.clearLibraryList  = clearLibraryList;
window.runSearch       = runSearch;
