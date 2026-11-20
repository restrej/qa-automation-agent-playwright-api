import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const FRAMEWORK_DIR = join(ROOT, 'automation');
const EXCLUDE = /(^|\/)(node_modules|allure-results|allure-report|target|reports|test-results|dist|cache)(\/|$)|(^|\/)\.env$/;

async function walk(dir, base = dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(base, full).replace(/\\/g, '/');
    if (EXCLUDE.test(rel)) continue;
    if (entry.isDirectory()) await walk(full, base, out);
    else out.push(rel);
  }
  return out;
}

/**
 * Empaqueta el framework base (carpeta /automation) + archivos generados
 * + casos Jira + pipeline de Azure DevOps en un ZIP listo para subir al repositorio.
 */
export async function buildProjectZip({ generatedFiles, extraFiles = {}, env = {} }) {
  const zip = new JSZip();
  const root = zip.folder('automation-generada');
  for (const rel of await walk(FRAMEWORK_DIR)) {
    if (generatedFiles[rel]) continue; // lo generado reemplaza al archivo base
    root.file(rel, await readFile(join(FRAMEWORK_DIR, rel)));
  }
  for (const [rel, content] of Object.entries({ ...generatedFiles, ...extraFiles })) root.file(rel, content);
  // El pipeline del repo asume la carpeta /automation; en el ZIP el framework queda en la raíz
  const adapt = (yml) => yml.replace(/WORKDIR: automation/g, 'WORKDIR: .').replace(/automation\//g, '');
  for (const rel of ['azure-pipelines.yml', 'pipelines/templates/publish-results.yml']) {
    const content = await readFile(join(ROOT, rel), 'utf8').catch(() => null);
    if (content) root.file(rel, adapt(content));
  }
  root.file(
    '.env.example',
    [
      '# Navegador: chromium | chrome | firefox | webkit',
      'BROWSER=chromium',
      'HEADLESS=true',
      `BASE_URL=${env.baseUrl ?? 'https://demowebshop.tricentis.com'}`,
      `API_BASE_URL=${env.apiBaseUrl ?? 'https://webservice.toscacloud.com'}`,
      'DEFAULT_TIMEOUT=30000',
      'RETRIES=0',
      'PARALLEL=0',
      '',
    ].join('\n'),
  );
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** Guarda la ejecución en agent/output/<fecha>/ para revisarla fuera del navegador. */
export async function saveRun(outputDir, files) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(outputDir, stamp);
  for (const [rel, content] of Object.entries(files)) {
    const target = join(dir, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}
