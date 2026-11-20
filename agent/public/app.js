const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const state = { site: null, api: null, run: null, extraCases: [], defaults: null };

// ---------- Utilidades ----------
function log(lines) {
  const el = $('#log');
  const text = Array.isArray(lines) ? lines.join('\n') : lines;
  el.textContent += `\n${text}`;
  el.scrollTop = el.scrollHeight;
}

async function call(url, body, button) {
  button?.classList.add('loading');
  button && (button.disabled = true);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.logs?.length) log(data.logs);
    if (!data.ok) throw new Error(data.error);
    return data;
  } catch (err) {
    log(`✖ ${err.message}`);
    throw err;
  } finally {
    button?.classList.remove('loading');
    button && (button.disabled = false);
  }
}

// ---------- Tabs ----------
document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button, .tab').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $(`#tab-${b.dataset.tab}`).classList.add('active');
  }),
);
const showTab = (name) => document.querySelector(`.tabs button[data-tab="${name}"]`).click();

// ---------- Datos de prueba ----------
const TEST_DATA_FIELDS = [
  ['purchase.category', 'Categoría'],
  ['purchase.subcategory', 'Subcategoría'],
  ['purchase.product', 'Producto'],
  ['billing.company', 'Company'],
  ['billing.country', 'Country'],
  ['billing.stateProvince', 'State / province'],
  ['billing.city', 'City'],
  ['billing.address1', 'Address 1'],
  ['billing.address2', 'Address 2'],
  ['billing.zipPostalCode', 'Zip / postal code'],
  ['billing.phoneNumber', 'Phone number'],
  ['billing.faxNumber', 'Fax number'],
  ['card.type', 'Select credit card'],
  ['card.holderName', 'Cardholder name'],
  ['card.number', 'Card number'],
  ['card.expiration', 'Expiration date (MM/AAAA)'],
  ['card.code', 'Card code'],
  ['successMessage', 'Mensaje final esperado'],
];
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

function renderTestDataForm(defaults) {
  $('#testDataForm').innerHTML = TEST_DATA_FIELDS.map(
    ([path, label]) => `<label>${label}<input type="text" data-path="${path}" value="${esc(getPath(defaults, path))}" /></label>`,
  ).join('');
}

function readTestData() {
  const data = structuredClone(state.defaults);
  document.querySelectorAll('#testDataForm input').forEach((i) => {
    const keys = i.dataset.path.split('.');
    const last = keys.pop();
    keys.reduce((a, k) => a[k], data)[last] = i.value.trim();
  });
  return data;
}

function readOptions() {
  return {
    registro: $('#optRegistro').checked,
    compra: $('#optCompra').checked,
    navegacion: $('#optNavegacion').checked,
    formularios: $('#optFormularios').checked,
    ui: $('#optUi').checked,
    api: $('#optApi').checked,
  };
}

// ---------- Render análisis ----------
function renderSite(site) {
  const flows = Object.entries(site.flows)
    .map(([k, v]) => `<span class="pill ${v ? 'ok' : 'no'}">${v ? '✔' : '✖'} ${k}</span>`)
    .join('');
  const cats = site.categories
    .map((c) => `<span class="pill">${esc(c.name)}${c.subcategories.length ? ' › ' + c.subcategories.map((s) => esc(s.name)).join(', ') : ''}</span>`)
    .join('');
  const pages = site.pages
    .map((p) => {
      const rows = p.forms
        .flatMap((f, fi) => [...f.fields, ...f.buttons].map((el) => ({ el, fi })))
        .slice(0, 40)
        .map(
          ({ el, fi }) => `<tr><td>${fi + 1}</td><td>${esc(el.label || el.name || el.htmlName || el.id)}</td><td>${esc(el.tag)}/${esc(el.type)}${el.required ? ' *' : ''}</td>
            <td class="s-${el.locator.strategy}">${el.locator.strategy}</td><td><code>${esc(el.locator.code)}</code></td></tr>`,
        )
        .join('');
      return `<div class="page-block">
        <h3><span class="pill k-${p.kind}">${p.kind}</span> ${esc(p.title)}</h3>
        <div class="url">${esc(p.url)} · ${esc(p.reason)}</div>
        ${rows ? `<table><thead><tr><th>Form</th><th>Elemento</th><th>Tipo</th><th>Estrategia</th><th>Localizador recomendado</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="hint">Sin formularios</p>'}
      </div>`;
    })
    .join('');
  $('#analysisSite').innerHTML = `<h3 class="section-title">Sitio: ${esc(site.url)}</h3>
    <div>${flows}</div><h3 class="section-title">Categorías</h3><div>${cats || '<span class="hint">No detectadas</span>'}</div>
    <h3 class="section-title">Páginas analizadas (${site.pages.length})</h3>${pages}`;
}

function renderApi(api) {
  const rows = api.resources
    .map((r) => {
      const ops = Object.entries(r.operations)
        .filter(([, v]) => v)
        .map(([k, v]) => `<span class="pill">${k}: ${v.method} ${esc(v.path)}${v.style === 'query' ? '?' + r.idParam + '=' : ''}</span>`)
        .join('');
      return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.schemaName)} (${Object.keys(r.schema.properties).join(', ')})</td><td>${ops}</td>
        <td>${r.isFullCrud ? '<span class="pill ok">CRUD completo</span>' : '<span class="pill no">parcial</span>'}</td></tr>`;
    })
    .join('');
  $('#analysisApi').innerHTML = `<h3 class="section-title">API: ${esc(api.title)} ${esc(api.version)} <span class="pill">${esc(api.source)}</span></h3>
    <p class="hint">URL base: ${esc(api.baseUrl)}</p>
    <table><thead><tr><th>Recurso</th><th>Modelo</th><th>Operaciones</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function refreshAnalysisEmpty() {
  $('#analysisEmpty').style.display = state.site || state.api ? 'none' : 'block';
}

// ---------- Render resultados ----------
function renderCases(cases) {
  $('#countCases').textContent = cases.length;
  $('#casesEmpty').style.display = cases.length ? 'none' : 'block';
  $('#cases').innerHTML = cases
    .map(
      (c) => `<article class="case p-${c.priority}">
      <header><span class="key">${c.key}</span><span class="sum">${esc(c.summary)}</span>
        <span class="pill">${c.priority}</span><span class="pill">${c.automation}</span></header>
      <div class="body">
        <div class="meta">Componente: <b>${esc(c.component)}</b> · Labels: ${c.labels.map((l) => `<span class="pill">${esc(l)}</span>`).join('')}
          ${c.feature ? `· Automatizado en <code>${esc(c.feature)}</code>` : ''}</div>
        ${c.precondition ? `<p><b>Precondición:</b> ${esc(c.precondition)}</p>` : ''}
        ${c.description ? `<p><b>Descripción:</b> ${esc(c.description)}</p>` : ''}
        <table><thead><tr><th>#</th><th>Acción</th><th>Datos</th><th>Resultado esperado</th></tr></thead><tbody>
        ${c.steps.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.action)}</td><td>${esc(s.data)}</td><td>${esc(s.expected)}</td></tr>`).join('')}
        </tbody></table>
      </div></article>`,
    )
    .join('');
  document.querySelectorAll('.case header').forEach((h) => h.addEventListener('click', () => h.parentElement.classList.toggle('open')));
}

function renderFiles(files) {
  const paths = Object.keys(files).sort();
  $('#countFiles').textContent = paths.length;
  let lastDir = '';
  $('#fileList').innerHTML = paths
    .map((p) => {
      const dir = p.split('/').slice(0, -1).join('/');
      const head = dir !== lastDir ? `<li class="dir">${esc(dir)}/</li>` : '';
      lastDir = dir;
      return `${head}<li data-path="${esc(p)}">${esc(p.split('/').pop())}</li>`;
    })
    .join('');
  document.querySelectorAll('#fileList li[data-path]').forEach((li) =>
    li.addEventListener('click', () => {
      document.querySelectorAll('#fileList li').forEach((x) => x.classList.remove('sel'));
      li.classList.add('sel');
      $('#previewName').textContent = li.dataset.path;
      $('#preview').textContent = files[li.dataset.path];
    }),
  );
  const first = document.querySelector('#fileList li[data-path$=".feature"]') ?? document.querySelector('#fileList li[data-path]');
  first?.click();
}

// ---------- Acciones ----------
$('#btnSite').addEventListener('click', async (e) => {
  log(`\n▶ Analizando sitio ${$('#siteUrl').value} ...`);
  const data = await call('/api/analyze-site', { url: $('#siteUrl').value, maxPages: $('#maxPages').value }, e.target);
  state.site = data.site;
  renderSite(state.site);
  refreshAnalysisEmpty();
  showTab('analysis');
});

$('#btnApi').addEventListener('click', async (e) => {
  log('\n▶ Analizando OpenAPI ...');
  const data = await call('/api/analyze-api', { specUrl: $('#specUrl').value, specText: $('#specText').value, baseUrl: $('#apiBaseUrl').value }, e.target);
  state.api = data.api;
  renderApi(state.api);
  refreshAnalysisEmpty();
  showTab('analysis');
});

$('#btnEnrich').addEventListener('click', async (e) => {
  const data = await call(
    '/api/enrich',
    { requirements: $('#requirements').value, site: state.site, cases: state.run?.cases ?? [] },
    e.target,
  );
  state.extraCases = data.extraCases;
  log(`Se agregarán ${data.extraCases.length} casos de IA en la próxima generación`);
});

$('#btnGenerate').addEventListener('click', async (e) => {
  log('\n▶ Generando casos y automatización ...');
  const data = await call(
    '/api/generate',
    { site: state.site, api: state.api, testData: readTestData(), options: readOptions(), extraCases: state.extraCases },
    e.target,
  );
  state.run = data;
  renderCases(data.cases);
  renderFiles(data.files);
  $('#btnZip').href = `/api/runs/${data.runId}/zip`;
  $('#btnZip').classList.remove('disabled');
  $('#outputDir').textContent = `También guardado en: ${data.outputDir}`;
  showTab('jira');
});

document.querySelectorAll('[data-export]').forEach((b) =>
  b.addEventListener('click', () => {
    if (!state.run) return log('Primero genera los casos');
    window.location.href = `/api/runs/${state.run.runId}/file?path=${encodeURIComponent(b.dataset.export)}`;
  }),
);

$('#btnCopy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#preview').textContent);
  $('#btnCopy').textContent = 'Copiado ✓';
  setTimeout(() => ($('#btnCopy').textContent = 'Copiar'), 1500);
});

// ---------- Inicio ----------
const health = await fetch('/api/health').then((r) => r.json());
state.defaults = health.defaults;
renderTestDataForm(health.defaults);
$('#llmBadge').textContent = `IA: ${health.llm ? 'habilitada' : 'opcional (sin API key)'}`;
if (health.llm) $('#llmBadge').classList.add('on');
