// ============================================================
// PTSS Onderzoeksmonitor — app.js
// ============================================================

// ============================================================
// CLUSTERS
// Elke query heeft twee varianten:
//   pubmed:  echte boolean met MeSH/tiab-velden — PTSS verplicht
//   general: voor Semantic Scholar (pure relevantie) en OpenAlex
// ============================================================

// Verplicht PubMed-anker — zorgt dat alle resultaten PTSS-gerelateerd zijn
const PUBMED_PTSD_ANCHOR =
  '("Stress Disorders, Post-Traumatic"[mesh] OR PTSD[tiab] OR ' +
  '"posttraumatic stress"[tiab] OR "post-traumatic stress"[tiab])';

const CLUSTERS = [
  {
    id: 'differential',
    label: 'Differentiële effectiviteit',
    shortLabel: 'Diff. effect.',
    queries: [
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND (moderator[tiab] OR predictor[tiab]) AND (psychotherapy[mesh] OR "trauma-focused"[tiab])`,
        general: 'PTSD treatment moderators predictors differential effectiveness psychotherapy'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND (EMDR[tiab] OR "prolonged exposure"[tiab] OR "cognitive processing therapy"[tiab] OR "imagery rescripting"[tiab]) AND ("comparative effectiveness"[tiab] OR "differential effect"[tiab] OR "treatment outcome"[tiab])`,
        general: 'PTSD EMDR CPT prolonged exposure imagery rescripting differential treatment outcome'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("personalized treatment"[tiab] OR "treatment matching"[tiab] OR "precision psychiatry"[tiab])`,
        general: 'PTSD personalized treatment matching precision psychiatry'
      }
    ]
  },
  {
    id: 'comorbidity',
    label: 'Comorbiditeit & contra-indicaties',
    shortLabel: 'Comorbiditeit',
    queries: [
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND comorbid*[tiab] AND (psychotherapy[mesh] OR "trauma-focused"[tiab]) AND "treatment outcome"[tiab]`,
        general: 'PTSD comorbidity trauma-focused psychotherapy treatment outcome'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("complex PTSD"[tiab] OR dissociation[tiab] OR dissociative[tiab]) AND (treatment[tiab] OR psychotherapy[mesh])`,
        general: 'PTSD complex dissociation dissociative treatment psychotherapy'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("borderline personality"[tiab] OR "personality disorder"[tiab] OR psychosis[tiab] OR suicidal*[tiab] OR "substance use"[tiab] OR "intellectual disabilit"[tiab] OR autism[tiab]) AND ("trauma-focused"[tiab] OR EMDR[tiab] OR "prolonged exposure"[tiab])`,
        general: 'PTSD borderline personality psychosis suicidality intellectual disability autism trauma-focused treatment'
      }
    ]
  },
  {
    id: 'clinical',
    label: 'Indicatiestelling & klinische besluitvorming',
    shortLabel: 'Indicatiestelling',
    queries: [
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("treatment selection"[tiab] OR "treatment indication"[tiab] OR "treatment matching"[tiab] OR "clinical decision"[tiab])`,
        general: 'PTSD treatment selection indication clinical decision making trauma-focused'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND (clinician[tiab] OR therapist[tiab] OR provider[tiab]) AND (barrier*[tiab] OR facilitator*[tiab] OR attitude*[tiab] OR belief*[tiab]) AND "trauma-focused"[tiab]`,
        general: 'PTSD clinician therapist provider barriers attitudes beliefs trauma-focused'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("treatment preference"[tiab] OR "patient preference"[tiab] OR "shared decision"[tiab]) AND (psychotherapy[mesh] OR "trauma-focused"[tiab])`,
        general: 'PTSD treatment patient preference shared decision making psychotherapy'
      }
    ]
  },
  {
    id: 'acceptability',
    label: 'Acceptability & adverse effects',
    shortLabel: 'Acceptability',
    queries: [
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND (dropout[tiab] OR attrition[tiab] OR acceptab*[tiab] OR "treatment refusal"[tiab]) AND (psychotherapy[mesh] OR "trauma-focused"[tiab])`,
        general: 'PTSD treatment dropout attrition acceptability trauma-focused psychotherapy'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("adverse effect"[tiab] OR deteriorat*[tiab] OR contraindication*[tiab] OR "symptom exacerbation"[tiab]) AND "trauma-focused"[tiab]`,
        general: 'PTSD trauma-focused adverse effects deterioration contraindication symptom exacerbation'
      }
    ]
  },
  {
    id: 'epidemiology',
    label: 'Behandelkloof & hulpzoekgedrag',
    shortLabel: 'Behandelkloof',
    queries: [
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND (undertreat*[tiab] OR "treatment gap"[tiab] OR underutiliz*[tiab] OR "unmet need"[tiab])`,
        general: 'PTSD treatment gap undertreatment unmet need'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("help-seeking"[tiab] OR "treatment utilization"[tiab] OR "treatment access"[tiab]) AND (barrier*[tiab] OR facilitator*[tiab])`,
        general: 'PTSD help-seeking treatment utilization access barriers'
      }
    ]
  },
  {
    id: 'guideline',
    label: 'Richtlijn-praktijk gap',
    shortLabel: 'Richtlijn gap',
    queries: [
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND (guideline*[tiab] OR "clinical practice guideline"[mesh]) AND (implementation[tiab] OR adherence[tiab] OR "practice gap"[tiab])`,
        general: 'PTSD clinical guideline implementation adherence practice gap'
      },
      {
        pubmed:  `${PUBMED_PTSD_ANCHOR} AND ("evidence-based"[tiab] OR "evidence-practice"[tiab]) AND (gap[tiab] OR barrier*[tiab]) AND ("trauma-focused"[tiab] OR psychotherapy[mesh])`,
        general: 'PTSD evidence-based practice gap barrier trauma-focused psychotherapy'
      }
    ]
  }
];

// ============================================================
// RELEVANCE SCORING
// Based on research question: "According to clinicians, what
// patient, clinician, intervention and system factors influence
// whether they indicate a TFT and which TFT they select for
// adult PTSD patients?" (Fraikin, 2026 — Crossing the gap)
// ============================================================
const RELEVANCE_PROFILE = {
  // Tier 1 — kern van de onderzoeksvraag (+12 titel / +7 abstract per treffer)
  tier1: [
    // Behandelselectie & indicatiestelling
    'treatment selection', 'treatment indication', 'treatment matching',
    'treatment choice', 'treatment decision', 'clinical decision',
    'clinical reasoning', 'decision making', 'indicatiestelling',
    'who benefits', 'treatment algorithm', 'treatment recommendation',
    'personalized treatment', 'tailored treatment', 'precision treatment',
    'individualized treatment', 'treatment suitability',
    // Differentiële effectiviteit — centrale empirische vraag
    'differential effectiveness', 'differential efficacy', 'differential effect',
    'differential response', 'treatment moderator', 'moderator of treatment',
    'moderators of treatment outcome', 'predictor of treatment response',
    'treatment predictor', 'baseline predictor',
    // Barrières & facilitatoren voor TFT — directe focus interviews
    'clinician barrier', 'therapist barrier', 'barrier to treatment',
    'facilitator', 'science-practice gap', 'evidence-practice gap',
    'practice gap', 'treatment gap', 'guideline adherence',
    'implementation barrier', 'clinician belief', 'therapist belief',
    'clinician attitude', 'therapist attitude', 'treatment reluctance',
    'resistance to treatment', 'provider attitude', 'provider belief',
  ],
  // Tier 2 — sterk gerelateerd (+6 titel / +3 abstract)
  tier2: [
    // Specifieke TFTs uit het voorstel
    'emdr', 'eye movement desensitization', 'prolonged exposure',
    'cognitive processing therapy', 'imagery rescripting', 'imrs',
    'tf-cbt', 'trauma-focused cbt', 'narrative exposure therapy',
    'brief eclectic', 'bepp', 'writing therapy',
    // Adverse effects & contra-indicaties — kernthema interviews
    'contraindication', 'contra-indication', 'adverse effect',
    'deterioration', 'negative effect', 'symptom exacerbation',
    'dropout', 'attrition', 'treatment acceptability', 'treatment refusal',
    'treatment completion', 'premature termination',
    // Specifieke comorbiditeiten als mogelijke contra-indicaties
    'complex ptsd', 'complex post-traumatic', 'dissociation', 'dissociative',
    'personality disorder', 'borderline personality',
    'psychotic disorder', 'psychosis', 'schizophrenia',
    'substance use disorder', 'suicidal', 'suicidality',
    'intellectual disability', 'autism spectrum', 'autistic',
    'traumatic brain injury', 'acquired brain injury',
    'major depressive disorder', 'comorbid depression',
    // Clinicus- en systeemfactoren
    'therapist training', 'clinician training', 'supervision',
    'patient preference', 'treatment preference', 'shared decision',
    'caseload', 'system barrier', 'organizational barrier',
  ],
  // Tier 3 — bredere context (+2 titel / +1 abstract)
  tier3: [
    'ptsd', 'posttraumatic stress', 'post-traumatic stress',
    'trauma therapy', 'trauma treatment', 'trauma-focused',
    'psychotherapy', 'comorbidity', 'treatment outcome',
    'evidence-based treatment', 'meta-analysis', 'systematic review',
    'randomized controlled trial', 'implementation', 'clinical guideline',
  ],
};

// Clusterprioriteit voor deze onderzoeksvraag (0-20)
const CLUSTER_PRIORITY = {
  clinical:      20,   // Indicatiestelling — kern
  differential:  18,   // Differentiële effectiviteit — kern empirische vraag
  comorbidity:   15,   // Comorbiditeit als contra-indicatie — centraal in interviews
  acceptability: 12,   // Adverse effects & acceptability — centraal in interviews
  guideline:     10,   // Richtlijn-praktijk gap — direct relevant
  epidemiology:   4,   // Behandelkloof — contextfactor, minst direct relevant
};

function scoreArticle(article) {
  const id = articleId(article);
  // Manual score takes highest priority (1–5 stars → 20–100)
  if (manualScores[id]) return manualScores[id].score * 20;
  // LLM score second priority (0–10 → 0–100)
  if (llmScores[id]) return Math.round(llmScores[id].score * 10);

  const titleText   = (article.title   || '').toLowerCase();
  const abstractText = (abstractCache[id] || article.abstract || '').toLowerCase();

  let score = 0;

  // --- Keyword scoring ---
  for (const [tier, terms] of Object.entries(RELEVANCE_PROFILE)) {
    const titleW    = tier === 'tier1' ? 12 : tier === 'tier2' ? 6  : 2;
    const abstractW = tier === 'tier1' ? 7  : tier === 'tier2' ? 3  : 1;
    for (const term of terms) {
      if (titleText.includes(term))    score += titleW;
      if (abstractText.includes(term)) score += abstractW;
    }
  }

  // Cap keyword contribution at 60
  score = Math.min(score, 60);

  // Domeincheck: als PTSS/trauma nergens in titel of abstract voorkomt, zware penalty
  // (vangt off-topic artikelen die door brede SS/OA-matching binnenkomen)
  const domainTerms = ['ptsd', 'posttraumatic', 'post-traumatic', 'stress disorder', 'trauma'];
  const hasDomain = domainTerms.some(t => titleText.includes(t) || abstractText.includes(t));
  if (!hasDomain) score = Math.max(0, score - 45);

  // --- Cluster priority (0-20) ---
  score += CLUSTER_PRIORITY[article.cluster] || 5;

  // --- Citation score (0-10, log-scaled) ---
  if (article.citations != null && article.citations > 0) {
    score += Math.min(10, Math.log10(article.citations + 1) * 4);
  }

  // --- Year recency (0-10) ---
  const year = parseInt(article.year) || 0;
  if (year >= 2020) score += 10;
  else if (year >= 2015) score += 7;
  else if (year >= 2010) score += 4;
  else if (year >= 2000) score += 1;

  // Normalize to 0-100
  return Math.min(100, Math.round(score));
}

function relevanceTier(score) {
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  if (score >= 15) return 'low';
  return 'minimal';
}

// ---- State ----
let allArticles = [];
let currentSort = 'relevance';
let hideMinimalRelevance = false;
let readSet = new Set();
let savedSet = new Set();
let excludedSet = new Set();
let abstractCache = {};
let llmScores      = {};  // articleId → { score:0-10, reasoning, evaluatedAt }
let manualScores   = {};  // articleId → { score:1-5, ratedAt }
let llmMemo        = '';  // lerend evaluatiedocument
let libraryCache   = {};  // doi → { title, abstract, year, authors }
let extraQueries   = {};  // cluster.id → [{general, pubmed}]
let pendingProposal = null; // tijdelijk voorstel voor query-optimalisatie
let isEvaluating = false;
let currentCluster = 'all';
let currentFilter = 'all';
let isSearching = false;
let deferredInstall = null;

// ---- LocalStorage keys ----
const LS_LAST_SEARCH    = 'ptss_last_search';
const LS_ARTICLES       = 'ptss_articles';
const LS_READ           = 'ptss_read';
const LS_SAVED          = 'ptss_saved';
const LS_EXCLUDED       = 'ptss_excluded';
const LS_ABSTRACTS      = 'ptss_abstracts';
const LS_API_KEY        = 'ptss_api_key';
const LS_LLM_SCORES     = 'ptss_llm_scores';
const LS_MANUAL_SCORES  = 'ptss_manual_scores';
const LS_EXTRA_QUERIES  = 'ptss_extra_queries';
const LS_LLM_MEMO       = 'ptss_llm_memo';
const LS_LIBRARY_CACHE  = 'ptss_library_cache';

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  registerSW();
  loadState();
  renderTabs();
  renderFilterBar();
  renderArticles();
  updateStatusBar();
  updateApiKeyUI();
  setupInstallPrompt();
  checkAutoSearch();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_ARTICLES);
    allArticles = raw ? JSON.parse(raw) : [];
    readSet      = new Set(JSON.parse(localStorage.getItem(LS_READ)      || '[]'));
    savedSet     = new Set(JSON.parse(localStorage.getItem(LS_SAVED)     || '[]'));
    excludedSet  = new Set(JSON.parse(localStorage.getItem(LS_EXCLUDED)  || '[]'));
    abstractCache = JSON.parse(localStorage.getItem(LS_ABSTRACTS)  || '{}');
    llmScores    = JSON.parse(localStorage.getItem(LS_LLM_SCORES)   || '{}');
    manualScores = JSON.parse(localStorage.getItem(LS_MANUAL_SCORES) || '{}');
    llmMemo      = localStorage.getItem(LS_LLM_MEMO) || '';
    libraryCache = JSON.parse(localStorage.getItem(LS_LIBRARY_CACHE) || '{}');
    extraQueries = JSON.parse(localStorage.getItem(LS_EXTRA_QUERIES) || '{}');
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
    saveLLMState();
  } catch(e) {
    console.warn('localStorage full?', e);
  }
}

function saveLLMState() {
  try {
    localStorage.setItem(LS_LLM_SCORES,    JSON.stringify(llmScores));
    localStorage.setItem(LS_MANUAL_SCORES, JSON.stringify(manualScores));
    localStorage.setItem(LS_LLM_MEMO,      llmMemo);
    localStorage.setItem(LS_LIBRARY_CACHE, JSON.stringify(libraryCache));
    localStorage.setItem(LS_EXTRA_QUERIES, JSON.stringify(extraQueries));
  } catch(e) {}
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
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')  // URL form
    .replace(/^doi:\s*/i, '')                         // doi: prefix
    .replace(/\s+/g, '')                              // internal spaces
    .replace(/[.,;]+$/, '')                           // trailing punctuation
    .replace(/\/v\d+$/, '');                          // version suffix (/v1, /v2)
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
async function searchPubMed(queryObj, fromDate) {
  // Use boolean pubmed query if available, else fall back to general string
  const queryStr = (typeof queryObj === 'object' ? queryObj.pubmed : queryObj) || queryObj;
  const dateFilter = fromDate ? `&mindate=${fromDate}&maxdate=3000/01/01&datetype=pdat` : '';
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(queryStr)}&retmax=30&retmode=json${dateFilter}`;
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

async function searchSemanticScholar(queryObj, fromDate) {
  const queryStr = (typeof queryObj === 'object' ? queryObj.general : queryObj) || queryObj;
  const yearFilter = fromDate ? `&year=${new Date(fromDate).getFullYear()}-` : '';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(queryStr)}&fields=title,authors,year,externalIds,citationCount,journal,venue,abstract&limit=25${yearFilter}`;
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

async function searchOpenAlex(queryObj, fromDate) {
  // OpenAlex supports boolean AND/OR — use general query (already contains PTSD)
  const queryStr = (typeof queryObj === 'object' ? queryObj.general : queryObj) || queryObj;
  const dateFilter = fromDate ? `,from_publication_date:${fromDate}` : '';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(queryStr)}&filter=type:article${dateFilter}&per-page=25&select=id,title,authorships,publication_year,doi,primary_location,cited_by_count,abstract_inverted_index&mailto=ptss-monitor@example.com`;
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

  const fullSearch = document.getElementById('full-search-toggle')?.checked;
  const fromDate = fullSearch ? null : getLastSearch();
  const today = new Date().toISOString().split('T')[0];
  if (fullSearch) updateProgress('Volledige zoekactie (geen datumfilter)…');
  let newArticles = [];
  const total = CLUSTERS.reduce((s, c) => s + c.queries.length + (extraQueries[c.id]?.length || 0), 0);
  let done = 0;

  for (const cluster of CLUSTERS) {
    const allQueries = [...cluster.queries, ...(extraQueries[cluster.id] || [])];
    for (const query of allQueries) {
      const queryLabel = typeof query === 'object' ? query.general : query;
      updateProgress(`${cluster.shortLabel}: "${queryLabel.substring(0, 35)}…"`);
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

  // Auto-evaluate with AI if API key is set and there are new articles to evaluate
  if (getApiKey() && visible.length > 0) {
    await sleep(800);
    runAIEvaluation();
  }
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
  const sorts = [
    { id: 'relevance', label: '★ Relevantie' },
    { id: 'date',      label: 'Datum' },
    { id: 'citations', label: 'Citaties' },
  ];
  const countLabel = `<span class="count-label" id="article-count"></span>`;
  const relevanceToggleClass = hideMinimalRelevance ? 'sort-btn active' : 'sort-btn';
  bar.innerHTML =
    `<div class="filter-row">` +
    filters.map(f =>
      `<button class="filter-btn${currentFilter === f.id ? ' active' : ''}" onclick="selectFilter('${f.id}')">${f.label}</button>`
    ).join('') +
    countLabel +
    `</div>` +
    `<div class="sort-row">` +
    `<span class="sort-label">Sorteren:</span>` +
    sorts.map(s =>
      `<button class="sort-btn${currentSort === s.id ? ' active' : ''}" onclick="selectSort('${s.id}')">${s.label}</button>`
    ).join('') +
    `<span class="sort-divider">|</span>` +
    `<button class="${relevanceToggleClass}" onclick="toggleRelevanceFilter()">` +
    (hideMinimalRelevance ? '★ Hoog &amp; relevant' : '★ Alle relevantie') +
    `</button>` +
    `</div>`;
}

function getFilteredArticles() {
  let articles = currentCluster === 'all'
    ? allArticles
    : allArticles.filter(a => a.cluster === currentCluster);

  if (currentFilter === 'excluded') {
    articles = articles.filter(a => isExcluded(a));
  } else {
    articles = articles.filter(a => !isExcluded(a));
    if (currentFilter === 'new')    articles = articles.filter(a => a.isNew);
    else if (currentFilter === 'saved')  articles = articles.filter(a => savedSet.has(articleId(a)));
    else if (currentFilter === 'unread') articles = articles.filter(a => !readSet.has(articleId(a)));
    // Optioneel: verberg artikelen met score < drempel
    if (hideMinimalRelevance) articles = articles.filter(a => scoreArticle(a) >= 15);
  }

  return articles.sort((a, b) => {
    if (currentSort === 'relevance') {
      const diff = scoreArticle(b) - scoreArticle(a);
      if (diff !== 0) return diff;
      // Tiebreak: new first, then date
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      return (b.year || '0').localeCompare(a.year || '0');
    }
    if (currentSort === 'citations') {
      return (b.citations || 0) - (a.citations || 0);
    }
    // 'date': new first, then year desc
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
        <span class="state-icon">🔬</span>
        <h3>Nog geen resultaten</h3>
        <p>Druk op <strong>Zoeken</strong> om de databases te doorzoeken op publicaties over PTSS-behandelindicatie.</p>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="state-card">
        <span class="state-icon">🔍</span>
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

  const score = scoreArticle(article);
  const tier  = relevanceTier(score);
  const tierLabels = { high: '★★★ Hoog', medium: '★★ Relevant', low: '★ Laag', minimal: '' };
  const llm  = llmScores[id];
  const man  = manualScores[id];
  const relTag = man
    ? `<span class="tag tag-rel tag-manual">${'★'.repeat(man.score)}${'☆'.repeat(5 - man.score)} Mijn score</span>`
    : llm
      ? `<span class="tag tag-rel tag-llm">🤖 ${llm.score}/10</span>`
      : tier !== 'minimal'
        ? `<span class="tag tag-rel tag-rel-${tier}">${tierLabels[tier]}</span>`
        : '';
  const llmReasoning = llm && !man
    ? `<div class="llm-reasoning">${escHtml(llm.reasoning)}</div>`
    : '';

  // Star rating widget (1–5 stars)
  const manStars = man ? man.score : 0;
  const starBtns = [1,2,3,4,5].map(s =>
    `<button class="star-btn${manStars >= s ? ' filled' : ''}" onclick="setManualScore('${safeId}',${s})" title="${s} ster${s===1?'':'ren'}">${manStars >= s ? '★' : '☆'}</button>`
  ).join('');
  const clearStar = man ? `<button class="star-clear" onclick="clearManualScore('${safeId}')" title="Beoordeling wissen">×</button>` : '';
  const starWidget = `<span class="star-rating" title="Jouw beoordeling">${starBtns}${clearStar}</span>`;

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
  <div class="article-tags">${relTag}${sourceTag}${yearTag}${citTag}</div>
  ${llmReasoning}
  <div class="article-actions">
    <button class="${readClass}" onclick="toggleRead('${safeId}')">${readLabel}</button>
    <button class="${saveClass}" onclick="toggleSave('${safeId}')">${saveLabel}</button>
    <button class="action-btn abstract-btn" onclick="toggleAbstract(${idx})">${absLabel}</button>
    ${excludeBtn}
    ${starWidget}
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

function selectSort(id) {
  currentSort = id;
  renderFilterBar();
  renderArticles();
}

function toggleRelevanceFilter() {
  hideMinimalRelevance = !hideMinimalRelevance;
  renderFilterBar();
  renderArticles();
  if (hideMinimalRelevance) showToast('Artikelen met minimale relevantie verborgen');
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

// ---- API key management ----
function getApiKey() { return localStorage.getItem(LS_API_KEY) || ''; }
function saveApiKeyFromInput() {
  const input = document.getElementById('api-key-input');
  const val = (input?.value || '').trim();
  if (!val || val.startsWith('•')) { showToast('Voer een geldige API-sleutel in.'); return; }
  localStorage.setItem(LS_API_KEY, val);
  if (input) input.value = '•'.repeat(Math.min(val.length, 20));
  updateApiKeyUI();
  showToast('API-sleutel opgeslagen');
}
function removeApiKey() {
  localStorage.removeItem(LS_API_KEY);
  const input = document.getElementById('api-key-input');
  if (input) input.value = '';
  updateApiKeyUI();
  showToast('API-sleutel verwijderd');
}
function updateApiKeyUI() {
  const key = getApiKey();
  const status = document.getElementById('api-key-status');
  const aiBtn  = document.getElementById('ai-eval-btn');
  if (status) {
    status.textContent = key ? '✓ API-sleutel opgeslagen' : 'Geen API-sleutel ingesteld';
    status.className = 'api-key-status ' + (key ? 'status-ok' : 'status-none');
  }
  if (aiBtn) aiBtn.style.display = key ? '' : 'none';
}

// ---- Library enrichment ----
async function enrichLibrary() {
  const dois = [...excludedSet]
    .filter(id => id.startsWith('doi:'))
    .map(id => id.slice(4))
    .filter(doi => !libraryCache[doi]);

  if (!dois.length) { showToast('Alle bibliotheek-items al verrijkt of geen DOIs.'); return; }

  document.getElementById('progress-overlay').classList.add('visible');
  let enriched = 0;
  const BATCH = 5;

  for (let i = 0; i < dois.length; i += BATCH) {
    const batch = dois.slice(i, i + BATCH);
    updateProgress(`Bibliotheek verrijken: ${Math.min(i + BATCH, dois.length)}/${dois.length}...`);
    await Promise.all(batch.map(async doi => {
      // Semantic Scholar
      try {
        const r = await fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,year,authors`);
        if (r.ok) {
          const d = await r.json();
          if (d.title) {
            libraryCache[doi] = { title: d.title, abstract: d.abstract || '', year: String(d.year || ''), authors: (d.authors||[]).slice(0,3).map(a=>a.name).join(', ') };
            enriched++; return;
          }
        }
      } catch(e) {}
      // OpenAlex fallback
      try {
        const r = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}?select=title,abstract_inverted_index,publication_year,authorships&mailto=ptss-monitor@example.com`);
        if (r.ok) {
          const d = await r.json();
          const abstract = reconstructOpenAlexAbstract(d.abstract_inverted_index);
          if (d.title) {
            libraryCache[doi] = { title: d.title, abstract: abstract || '', year: String(d.publication_year || ''), authors: (d.authorships||[]).slice(0,3).map(a=>a.author?.display_name||'').filter(Boolean).join(', ') };
            enriched++;
          }
        }
      } catch(e) {}
    }));
    saveLLMState();
    await sleep(300);
  }

  document.getElementById('progress-overlay').classList.remove('visible');
  updateLibraryStats();
  showToast(`Verrijking klaar: ${enriched}/${dois.length} DOIs gevonden`);
}

// ---- AI evaluation ----
async function runAIEvaluation() {
  if (isEvaluating) return;
  const apiKey = getApiKey();
  if (!apiKey) { showToast('Voer eerst een Anthropic API-sleutel in via Bibliotheek.'); return; }

  const toEvaluate = allArticles.filter(a => !isExcluded(a) && !llmScores[articleId(a)]);
  if (!toEvaluate.length) { showToast('Alle zichtbare artikelen zijn al geëvalueerd.'); return; }

  isEvaluating = true;
  document.getElementById('progress-overlay').classList.add('visible');

  const libraryExamples = Object.values(libraryCache)
    .filter(v => v.abstract && v.abstract.length > 50)
    .slice(0, 6)
    .map(v => `• ${v.title} (${v.year}): ${v.abstract.substring(0, 250)}...`)
    .join('\n');

  const BATCH_SIZE = 8;
  let done = 0;
  for (let i = 0; i < toEvaluate.length; i += BATCH_SIZE) {
    const batch = toEvaluate.slice(i, i + BATCH_SIZE);
    updateProgress(`AI-evaluatie: ${done}/${toEvaluate.length} artikelen...`);
    await evaluateBatch(batch, apiKey, libraryExamples);
    done += batch.length;
    saveLLMState();
    renderArticles();
    await sleep(600);
  }

  if (done > 0) {
    updateProgress('Leermemo bijwerken...');
    await updateLearningMemo(apiKey, toEvaluate.slice(0, 20));
  }

  isEvaluating = false;
  document.getElementById('progress-overlay').classList.remove('visible');
  updateLibraryStats();
  renderArticles();
  showToast(`${done} artikel${done===1?'':'en} geëvalueerd door AI`);
}

async function evaluateBatch(articles, apiKey, libraryExamples) {
  const articleTexts = articles.map((a, i) => {
    const id = articleId(a);
    const abs = abstractCache[id] || a.abstract || '';
    return `[${i+1}] TITEL: ${a.title}\nABSTRACT: ${abs ? abs.substring(0, 400) : '(niet beschikbaar)'}`;
  }).join('\n\n---\n\n');

  const memoSection  = llmMemo ? `\n\nLEERMEMO (vorige sessies):\n${llmMemo}` : '';
  const libSection   = libraryExamples ? `\n\nVOORBEELDEN UIT BIBLIOTHEEK GEBRUIKER:\n${libraryExamples}` : '';

  const systemPrompt =
    `Je bent een wetenschappelijk assistent die artikelen beoordeelt op relevantie voor promotieonderzoek.

ONDERZOEKSVRAAG: Welke patiënt-, behandelaar-, interventie- en systeemfactoren beïnvloeden de indicatiestelling voor traumagerichte behandeling (TGT) bij volwassenen met PTSS? Specifiek: waarom kiezen clinici wel of niet voor TGT, en welke TGT selecteren ze? (Fraikin, 2026 — kwalitatief, Nederland)

THEMATISCH RELEVANT: behandelselectie, indicatiestelling, moderatoren TGT-effectiviteit, barrières/facilitatoren TGT, comorbiditeiten als contra-indicaties, patiëntpreferenties, clinicus-attitudes, richtlijn-praktijk kloof, EMDR/PE/CPT/ImRS.${memoSection}${libSection}`;

  const userPrompt =
    `Beoordeel de volgende ${articles.length} artikelen (0–10 relevantiescore).\n\n${articleTexts}\n\nAntwoord uitsluitend als JSON-array:\n[{"index":1,"score":7,"reasoning":"Eén zin waarom relevant of niet"},...]\n\nScores: 0–3 = niet relevant, 4–6 = matig, 7–9 = relevant, 10 = kernrelevant. Wees kritisch.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!resp.ok) { console.warn('Claude API:', await resp.text()); return; }
    const data  = await resp.json();
    const text  = data.content?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return;
    const results = JSON.parse(match[0]);
    const now = new Date().toISOString();
    for (const r of results) {
      const idx = r.index - 1;
      if (idx >= 0 && idx < articles.length) {
        llmScores[articleId(articles[idx])] = {
          score:      Math.max(0, Math.min(10, Number(r.score) || 0)),
          reasoning:  r.reasoning || '',
          evaluatedAt: now
        };
      }
    }
  } catch(e) { console.warn('evaluateBatch error:', e); }
}

async function updateLearningMemo(apiKey, evaluatedArticles) {
  const high = evaluatedArticles.filter(a => {
    const id = articleId(a);
    return (manualScores[id]?.score || 0) >= 4 || (llmScores[id]?.score || 0) >= 7;
  });
  if (!high.length) return;
  const examples = high.slice(0, 12).map(a => {
    const id = articleId(a);
    const man = manualScores[id];
    const llm = llmScores[id];
    const scoreStr = man ? `${man.score}★ (gebruiker)` : `${llm.score}/10 (AI)`;
    return `${scoreStr}: ${a.title}${llm?.reasoning ? ' — ' + llm.reasoning : ''}`;
  }).join('\n');
  // Also include highly manually-scored articles not in evaluatedArticles
  const extraManual = Object.entries(manualScores)
    .filter(([, ms]) => ms.score >= 4)
    .map(([id]) => allArticles.find(a => articleId(a) === id))
    .filter(a => a && !high.includes(a))
    .slice(0, 5)
    .map(a => `${manualScores[articleId(a)].score}★ (gebruiker): ${a.title}`)
    .join('\n');
  const feedbackSection = extraManual ? `\n\nEXTRA HANDMATIG BEOORDEELD:\n${extraManual}` : '';
  const prevSection = llmMemo ? `\n\nHUIDIG MEMO:\n${llmMemo}` : '';
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: `Schrijf een beknopt leermemo (max 150 woorden) over welke artikelen hoog scoorden en welke inhoudelijke patronen je ziet. Geef extra gewicht aan handmatige beoordelingen (★) boven AI-scores. Dit memo wordt hergebruikt bij volgende evaluatiesessies.\n\nHOOG GESCOORDE ARTIKELEN:\n${examples}${feedbackSection}${prevSection}\n\nFocus op inhoudelijke patronen, niet op procedure.` }]
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const newMemo = data.content?.[0]?.text || '';
      if (newMemo) { llmMemo = newMemo; saveLLMState(); }
    }
  } catch(e) {}
}

// ---- Manual scoring ----
function setManualScore(id, stars) {
  manualScores[id] = { score: stars, ratedAt: new Date().toISOString() };
  saveLLMState();
  renderArticles();
}

function clearManualScore(id) {
  delete manualScores[id];
  saveLLMState();
  renderArticles();
}

// ---- Query optimisation ----
async function optimizeSearchQueries() {
  const apiKey = getApiKey();
  if (!apiKey) { showToast('Voer eerst een API-sleutel in.'); return; }

  // Build feedback from manual + LLM scores
  const feedbackItems = allArticles.map(a => {
    const id = articleId(a);
    const man = manualScores[id];
    const llm = llmScores[id];
    if (!man && !llm) return null;
    return { title: a.title, cluster: a.cluster, manualScore: man?.score || null, llmScore: llm?.score || null, reasoning: llm?.reasoning || '' };
  }).filter(Boolean);

  if (feedbackItems.length < 3) {
    showToast('Score eerst meer artikelen (minimaal 3) voor optimalisatie.');
    return;
  }

  const high = feedbackItems.filter(a => (a.manualScore != null ? a.manualScore >= 4 : false) || (a.llmScore != null ? a.llmScore >= 7 : false));
  const low  = feedbackItems.filter(a => (a.manualScore != null ? a.manualScore <= 2 : false) || (a.llmScore != null ? a.llmScore <= 3  : false));

  const highLines = high.slice(0, 8).map(a => `✓ ${a.manualScore ? a.manualScore + '★' : 'AI:' + a.llmScore} [${a.cluster}] ${a.title}`).join('\n');
  const lowLines  = low.slice(0, 5).map(a => `✗ ${a.manualScore ? a.manualScore + '★' : 'AI:' + a.llmScore} [${a.cluster}] ${a.title}`).join('\n');

  const existingExtra = Object.entries(extraQueries).flatMap(([cid, qs]) => qs.map(q => `[${cid}] ${q.general}`)).join('\n');

  document.getElementById('progress-overlay').classList.add('visible');
  updateProgress('Zoekopdrachten optimaliseren...');

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content:
          `Je bent expert in academisch literatuurzoeken. Analyseer de volgende beoordeelde artikelen en stel 2–4 aanvullende zoektermen voor.

ONDERZOEKSVRAAG: Indicatiestelling voor traumagerichte behandeling (TGT) bij PTSS — welke factoren beïnvloeden klinische besluitvorming? (kwalitatief, Nederland)

CLUSTERS: differential, comorbidity, clinical, acceptability, epidemiology, guideline

HOOG BEOORDEELD (relevant):
${highLines || '(geen)'}

LAAG BEOORDEELD (niet relevant):
${lowLines || '(geen)'}

${existingExtra ? `AL TOEGEVOEGDE EXTRA QUERIES:\n${existingExtra}\n\n` : ''}Stel max 4 NIEUWE aanvullende queries voor (nog niet in de lijst). Geef je antwoord als JSON:
{
  "analysis": "Korte analyse van patronen (2–3 zinnen)",
  "extra_queries": [
    {"cluster": "clinical", "general": "PTSD indication shared decision making clinician", "rationale": "Reden"}
  ]
}` }]
      })
    });

    document.getElementById('progress-overlay').classList.remove('visible');

    if (!resp.ok) { showToast('API-fout bij optimalisatie.'); return; }
    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) { showToast('Kon voorstel niet parsen.'); return; }

    pendingProposal = JSON.parse(match[0]);
    renderQueryProposal();

  } catch(e) {
    document.getElementById('progress-overlay').classList.remove('visible');
    console.warn('optimizeSearchQueries error:', e);
    showToast('Fout: ' + e.message);
  }
}

function renderQueryProposal() {
  const el = document.getElementById('query-proposal');
  if (!el || !pendingProposal) return;

  const items = (pendingProposal.extra_queries || []).map(q =>
    `<div class="proposal-item">
      <span class="proposal-cluster">${escHtml(q.cluster)}</span>
      <span class="proposal-query">${escHtml(q.general)}</span>
      <div class="proposal-rationale">${escHtml(q.rationale)}</div>
    </div>`
  ).join('');

  el.innerHTML =
    `<div class="proposal-analysis">${escHtml(pendingProposal.analysis || '')}</div>` +
    `<div class="proposal-list">${items}</div>` +
    `<div class="proposal-actions">` +
    `<button class="btn-primary" onclick="applyPendingProposal()">Toepassen</button>` +
    `<button class="btn-secondary" onclick="discardPendingProposal()">Annuleren</button>` +
    `</div>`;
  el.style.display = '';
}

function applyPendingProposal() {
  if (!pendingProposal) return;
  let added = 0;
  for (const q of (pendingProposal.extra_queries || [])) {
    if (!extraQueries[q.cluster]) extraQueries[q.cluster] = [];
    const exists = extraQueries[q.cluster].some(eq => eq.general === q.general);
    if (!exists) { extraQueries[q.cluster].push({ general: q.general, pubmed: null }); added++; }
  }
  saveLLMState();
  pendingProposal = null;
  const el = document.getElementById('query-proposal');
  if (el) { el.innerHTML = ''; el.style.display = 'none'; }
  updateLibraryStats();
  showToast(`${added} extra zoekopdracht${added === 1 ? '' : 'en'} toegevoegd — actief bij volgende zoekactie`);
}

function discardPendingProposal() {
  pendingProposal = null;
  const el = document.getElementById('query-proposal');
  if (el) { el.innerHTML = ''; el.style.display = 'none'; }
}

function clearExtraQueries() {
  extraQueries = {};
  saveLLMState();
  updateLibraryStats();
  showToast('Extra zoekopdrachten verwijderd.');
}

// ---- Library exclusion modal ----
function openLibraryModal() {
  document.getElementById('library-modal').classList.add('open');
  updateApiKeyUI();
  updateLibraryStats();
}

function closeLibraryModal() {
  document.getElementById('library-modal').classList.remove('open');
}

function updateLibraryStats() {
  const count    = excludedSet.size;
  const matched  = allArticles.filter(a => isExcluded(a)).length;
  const enriched = Object.keys(libraryCache).length;
  const memoEl   = document.getElementById('llm-memo-display');
  if (memoEl) memoEl.textContent = llmMemo || '';
  if (memoEl) memoEl.style.display = llmMemo ? '' : 'none';
  const extraCount = Object.values(extraQueries).reduce((s, qs) => s + qs.length, 0);
  document.getElementById('library-stats').innerHTML =
    `${count} items in bibliotheek · ${matched} artikel${matched === 1 ? '' : 'en'} uitgesloten` +
    (enriched ? ` · ${enriched} verrijkt` : '') +
    (extraCount ? ` · <span class="memo-indicator">🔍 ${extraCount} extra quer${extraCount === 1 ? 'y' : 'ies'}</span>` : '') +
    (llmMemo ? ` · <span class="memo-indicator">📝 leermemo actief</span>` : '');
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

function previewLibraryParse(text) {
  const preview = document.getElementById('library-preview');
  if (!preview) return;
  if (!text.trim()) { preview.innerHTML = ''; return; }
  const parsed = parseLibraryText(text);
  const dois   = [...parsed].filter(id => id.startsWith('doi:')).length;
  const titles = [...parsed].filter(id => id.startsWith('title:')).length;
  if (parsed.size === 0) {
    preview.innerHTML = `<span class="preview-warn">Geen DOIs of titels herkend — controleer het formaat.</span>`;
  } else {
    const parts = [];
    if (dois)   parts.push(`${dois} DOI${dois   === 1 ? '' : 's'}`);
    if (titles) parts.push(`${titles} titel${titles === 1 ? '' : 's'}`);
    const matched = allArticles.filter(a => {
      const tmp = new Set([...excludedSet, ...parsed]);
      const origExcluded = excludedSet;
      // temporarily check against parsed set
      if (a.doi) return parsed.has('doi:' + normalizeDoi(a.doi));
      return parsed.has('title:' + normalizeTitle(a.title));
    }).length;
    preview.innerHTML = `<span class="preview-ok">✓ Herkend: ${parts.join(' + ')}${matched ? ` · ${matched} artikel${matched===1?'':'en'} in huidige resultaten` : ''}</span>`;
  }
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
  const dois   = [...parsed].filter(id => id.startsWith('doi:')).length;
  const titles = [...parsed].filter(id => id.startsWith('title:')).length;
  const parts  = [];
  if (dois)   parts.push(`${dois} DOI${dois===1?'':'s'}`);
  if (titles) parts.push(`${titles} titel${titles===1?'':'s'}`);
  showToast(`Ingeladen: ${parts.join(' + ')} · ${matched} artikel${matched===1?'':'en'} uitgesloten`);
  document.getElementById('library-textarea').value = '';
  document.getElementById('library-preview').innerHTML = '';
}

function clearLibraryList() {
  excludedSet.clear();
  saveState();
  updateLibraryStats();
  renderFilterBar();
  renderTabs();
  renderArticles();
  updateStatusBar();
  showToast('Bibliotheek geleegd.');
}

function resetAllArticles() {
  try { localStorage.removeItem(LS_ARTICLES);    } catch(e) {}
  try { localStorage.removeItem(LS_READ);         } catch(e) {}
  try { localStorage.removeItem(LS_ABSTRACTS);    } catch(e) {}
  try { localStorage.removeItem(LS_LAST_SEARCH);  } catch(e) {}
  try { localStorage.removeItem(LS_LLM_SCORES);    } catch(e) {}
  try { localStorage.removeItem(LS_MANUAL_SCORES); } catch(e) {}
  // Keep libraryCache, llmMemo, extraQueries — they are cross-session knowledge
  allArticles   = [];
  readSet       = new Set();
  abstractCache = {};
  llmScores     = {};
  manualScores  = {};
  const modal = document.getElementById('library-modal');
  if (modal) modal.classList.remove('open');
  renderTabs();
  renderFilterBar();
  renderArticles();
  updateStatusBar();
  showToast('Reset voltooid — druk op Zoeken om opnieuw te beginnen');
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
window.resetAllArticles    = resetAllArticles;
window.openLibraryModal    = openLibraryModal;
window.closeLibraryModal   = closeLibraryModal;
window.saveLibraryList     = saveLibraryList;
window.clearLibraryList    = clearLibraryList;
window.previewLibraryParse = previewLibraryParse;
window.selectSort             = selectSort;
window.toggleRelevanceFilter  = toggleRelevanceFilter;
window.runSearch          = runSearch;
window.saveApiKeyFromInput   = saveApiKeyFromInput;
window.removeApiKey          = removeApiKey;
window.enrichLibrary         = enrichLibrary;
window.runAIEvaluation       = runAIEvaluation;
window.setManualScore        = setManualScore;
window.clearManualScore      = clearManualScore;
window.optimizeSearchQueries = optimizeSearchQueries;
window.applyPendingProposal  = applyPendingProposal;
window.discardPendingProposal = discardPendingProposal;
window.clearExtraQueries     = clearExtraQueries;
