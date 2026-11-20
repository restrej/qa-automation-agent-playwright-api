import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeApi } from './src/analyzer/openApiAnalyzer.js';
import { analyzeSite } from './src/analyzer/siteAnalyzer.js';
import { generateApiFiles } from './src/generators/apiGenerator.js';
import { DEFAULT_TEST_DATA, generateJiraCases, toJiraCsv, toMarkdown, toXrayCsv } from './src/generators/jiraGenerator.js';
import { buildProjectZip, saveRun } from './src/generators/projectPackager.js';
import { generateUiFiles } from './src/generators/uiGenerator.js';
import { isLlmEnabled, suggestCases } from './src/llm/claude.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);
const runs = new Map(); // id -> { cases, files, zip }

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, 'public')));

const wrap = (fn) => async (req, res) => {
  const logs = [];
  const log = (m) => {
    logs.push(m);
    console.log(m);
  };
  try {
    res.json({ ok: true, logs, ...(await fn(req, log)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, logs, error: err.message });
  }
};

app.get('/api/health', (_req, res) => res.json({ ok: true, llm: isLlmEnabled(), defaults: DEFAULT_TEST_DATA }));

app.post(
  '/api/analyze-site',
  wrap(async (req, log) => {
    const { url, maxPages = 6 } = req.body;
    if (!/^https?:\/\//i.test(url ?? '')) throw new Error('Ingresa una URL válida (http/https)');
    return { site: await analyzeSite({ url, maxPages: Math.min(Number(maxPages) || 6, 20), log }) };
  }),
);

app.post(
  '/api/analyze-api',
  wrap(async (req, log) => {
    const { specUrl, specText, baseUrl } = req.body;
    if (!specUrl && !specText) throw new Error('Ingresa la URL del OpenAPI o pega el JSON');
    return { api: await analyzeApi({ specUrl: specUrl || 'http://localhost/', specText, baseUrl, log }) };
  }),
);

app.post(
  '/api/enrich',
  wrap(async (req, log) => {
    const { requirements, site, cases = [] } = req.body;
    if (!requirements?.trim()) throw new Error('Escribe la historia de usuario o los requisitos');
    const siteSummary = site
      ? site.pages.map((p) => `${p.kind}: ${p.url} (${p.forms.length} formularios)`).join('\n') +
        `\nCategorías: ${site.categories.map((c) => c.name).join(', ')}`
      : 'Sin análisis de sitio';
    log('Consultando a Claude para casos adicionales...');
    const extra = await suggestCases({ requirements, siteSummary, existingSummaries: cases.map((c) => c.summary) });
    log(`Claude propuso ${extra.length} casos`);
    return { extraCases: extra };
  }),
);

app.post(
  '/api/generate',
  wrap(async (req, log) => {
    const { site, api, testData = DEFAULT_TEST_DATA, options = {}, extraCases = [] } = req.body;
    if (!site && !api) throw new Error('Primero analiza el sitio y/o la API');

    let cases = generateJiraCases({ site, api, testData, options });
    cases = [...cases, ...extraCases].map((c, i) => ({ ...c, key: `TC-${String(i + 1).padStart(3, '0')}` }));
    log(`Casos de prueba generados: ${cases.length}`);

    const files = {};
    let uiSummary = null;
    let apiSummary = null;
    if (site && options.ui !== false) {
      const ui = generateUiFiles({ site, testData, options });
      Object.assign(files, ui.files);
      uiSummary = { pages: ui.pages, locatorStats: ui.locatorStats };
      log(`Page Objects generados: ${ui.pages.length}`);
    }
    if (api && options.api !== false) {
      const gen = generateApiFiles({ api });
      Object.assign(files, gen.files);
      apiSummary = { resources: gen.resources };
      log(`Recursos API generados: ${gen.resources.join(', ') || 'ninguno'}`);
    }
    const jiraFiles = {
      'docs/jira/casos-prueba-xray.csv': toXrayCsv(cases),
      'docs/jira/casos-prueba-jira.csv': toJiraCsv(cases),
      'docs/jira/casos-prueba.md': toMarkdown(cases),
      'docs/jira/casos-prueba.json': JSON.stringify(cases, null, 2),
    };
    const zip = await buildProjectZip({
      generatedFiles: files,
      extraFiles: jiraFiles,
      env: { baseUrl: site?.origin, apiBaseUrl: api?.baseUrl },
    });
    const outputDir = await saveRun(join(__dirname, 'output'), { ...files, ...jiraFiles });
    log(`Copia guardada en ${outputDir}`);

    const id = randomUUID();
    runs.set(id, { cases, files: { ...files, ...jiraFiles }, zip });
    return { runId: id, cases, files: { ...files, ...jiraFiles }, uiSummary, apiSummary, outputDir };
  }),
);

app.get('/api/runs/:id/zip', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).send('Ejecución no encontrada (reinicia la generación)');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="automation-generada.zip"');
  res.send(run.zip);
});

app.get('/api/runs/:id/file', (req, res) => {
  const run = runs.get(req.params.id);
  const content = run?.files[req.query.path];
  if (content === undefined) return res.status(404).send('Archivo no encontrado');
  const name = String(req.query.path).split('/').pop();
  res.setHeader('Content-Type', name.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  // BOM para que Excel/Jira respeten tildes en CSV
  res.send(name.endsWith('.csv') ? '﻿' + content : content);
});

app.listen(PORT, () => {
  console.log(`\n🤖 QA Automation Agent corriendo en http://localhost:${PORT}`);
  console.log(`   IA (Claude): ${isLlmEnabled() ? 'habilitada' : 'deshabilitada (opcional: ANTHROPIC_API_KEY)'}\n`);
});
