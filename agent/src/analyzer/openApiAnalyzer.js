import { readFile } from 'node:fs/promises';

const FALLBACKS = {
  'webservice.toscacloud.com': new URL('../knowledge/toscaCoffeeShop.openapi.json', import.meta.url),
};
const CANDIDATE_SUFFIXES = ['', 'swagger.json', 'openapi.json', '../swagger/v1/swagger.json', '../../swagger/v1/swagger.json'];

async function tryFetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text);
  if (!json.paths) throw new Error('El documento no tiene "paths"');
  return json;
}

/** Descarga el OpenAPI (o usa JSON pegado / copia local de respaldo). */
export async function loadSpec({ specUrl, specText, log = () => {} }) {
  if (specText?.trim()) {
    log('Usando el OpenAPI pegado manualmente');
    return { spec: JSON.parse(specText), source: 'pegado' };
  }
  const errors = [];
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = new URL(suffix, specUrl.endsWith('/') ? specUrl : specUrl + '/').href;
    try {
      const spec = await tryFetchJson(suffix ? candidate : specUrl);
      log(`OpenAPI descargado de ${suffix ? candidate : specUrl}`);
      return { spec, source: suffix ? candidate : specUrl };
    } catch (err) {
      errors.push(`${suffix || specUrl}: ${err.message}`);
    }
  }
  const host = new URL(specUrl).host;
  if (FALLBACKS[host]) {
    log(`⚠ No se pudo descargar el OpenAPI (${errors[0]}). Se usa la copia local de respaldo de ${host}`);
    return { spec: JSON.parse(await readFile(FALLBACKS[host], 'utf8')), source: 'copia local' };
  }
  throw new Error(`No se pudo obtener el OpenAPI. Intentos: ${errors.join(' | ')}. Puedes pegar el JSON manualmente.`);
}

function resolveRef(spec, schema) {
  if (!schema) return undefined;
  if (schema.$ref) {
    const path = schema.$ref.replace(/^#\//, '').split('/');
    return { name: path.at(-1), ...path.reduce((acc, k) => acc?.[k], spec) };
  }
  return schema;
}

function bodySchema(spec, op) {
  const content = op?.requestBody?.content ?? {};
  const media = content['application/json'] ?? content['text/json'] ?? Object.values(content)[0];
  return resolveRef(spec, media?.schema ?? op?.parameters?.find((p) => p.in === 'body')?.schema);
}

/**
 * Detecta recursos con operaciones CRUD:
 *   POST /x, GET /x/{id}, PUT /x o /x/{id}, DELETE /x?id= o /x/{id}
 */
export function detectCrudResources(spec) {
  const paths = spec.paths ?? {};
  const resources = [];
  for (const [collection, ops] of Object.entries(paths)) {
    if (/\{[^}]+\}$/.test(collection) || !ops.post) continue;
    const itemPath = Object.keys(paths).find((p) => p.startsWith(collection + '/{') && /^\/\{[^}]+\}$/.test(p.slice(collection.length)));
    const item = itemPath ? paths[itemPath] : {};
    const idParam = itemPath?.match(/\{([^}]+)\}$/)?.[1] ?? 'id';
    const schema = bodySchema(spec, ops.post) ?? bodySchema(spec, ops.put);
    const name = collection.split('/').filter(Boolean).at(-1);
    const del = item.delete
      ? { method: 'DELETE', path: `${itemPath}`, style: 'path' }
      : ops.delete
        ? { method: 'DELETE', path: collection, style: ops.delete.parameters?.some((p) => p.in === 'query') ? 'query' : 'body' }
        : undefined;
    const put = item.put ? { path: itemPath, style: 'path' } : ops.put ? { path: collection, style: 'body' } : undefined;
    resources.push({
      name,
      collection,
      itemPath,
      idParam,
      schemaName: schema?.name ?? `${name}Model`,
      schema: { type: 'object', properties: schema?.properties ?? {}, additionalProperties: schema?.additionalProperties },
      operations: {
        create: { method: 'POST', path: collection },
        read: item.get ? { method: 'GET', path: itemPath } : undefined,
        list: ops.get ? { method: 'GET', path: collection } : undefined,
        update: put ? { method: 'PUT', ...put } : undefined,
        delete: del,
      },
      isFullCrud: Boolean(item.get && put && del),
    });
  }
  return resources;
}

export async function analyzeApi({ specUrl, specText, baseUrl, log }) {
  const { spec, source } = await loadSpec({ specUrl, specText, log });
  const resources = detectCrudResources(spec);
  const server = baseUrl || spec.servers?.[0]?.url || new URL(specUrl).origin;
  log?.(`Recursos con POST detectados: ${resources.map((r) => `${r.name}${r.isFullCrud ? ' (CRUD completo)' : ''}`).join(', ') || 'ninguno'}`);
  return { title: spec.info?.title, version: spec.info?.version, source, baseUrl: server, resources };
}
