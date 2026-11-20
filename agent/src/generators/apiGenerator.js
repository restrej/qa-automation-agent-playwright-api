/**
 * Genera automatización API REST (CRUD) a partir de un OpenAPI:
 *  - Cliente por recurso (hereda de BaseApiClient)
 *  - Esquema AJV del modelo (validación de contrato)
 *  - Builder de datos únicos
 *  - Registro de recursos + pasos genéricos CRUD
 *  - Feature por recurso con los 5 bloques (creación, consulta, actualización, eliminación, validación final)
 */
const pascal = (s) =>
  String(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
const singular = (s) => (s.endsWith('ies') ? s.slice(0, -3) + 'y' : s.endsWith('s') ? s.slice(0, -1) : s);

function jsonSchemaFor(resource) {
  const properties = {};
  for (const [k, v] of Object.entries(resource.schema.properties)) {
    const base = v.type ?? 'string';
    const type = v.nullable ? [base, 'null'] : base;
    properties[k] = k === resource.idParam ? { type: 'integer', minimum: 1 } : { type };
  }
  return {
    type: 'object',
    additionalProperties: resource.schema.additionalProperties ?? true,
    required: Object.keys(properties),
    properties,
  };
}

function samplePayloadCode(resource, suffixExpr, prefix) {
  const lines = Object.entries(resource.schema.properties).map(([k, v]) => {
    if (k === resource.idParam) return `    ${k}: 0,`;
    switch (v.type) {
      case 'integer':
      case 'number':
        return `    ${k}: 1,`;
      case 'boolean':
        return `    ${k}: true,`;
      case 'array':
        return `    ${k}: [],`;
      case 'object':
        return `    ${k}: {},`;
      default:
        return `    ${k}: \`${prefix} ${k} \${${suffixExpr}}\`,`;
    }
  });
  return `{\n${lines.join('\n')}\n  }`;
}

function renderClient(r) {
  const model = pascal(singular(r.name));
  const read = r.operations.read.path.replace(`{${r.idParam}}`, `\${id}`);
  const update =
    r.operations.update.style === 'path'
      ? `this.request.put(\`${r.operations.update.path.replace(`{${r.idParam}}`, `\${body.${r.idParam}}`)}\`, { data: body })`
      : `this.request.put('${r.operations.update.path}', { data: body })`;
  const del =
    r.operations.delete.style === 'path'
      ? `this.request.delete(\`${r.operations.delete.path.replace(`{${r.idParam}}`, `\${id}`)}\`)`
      : `this.request.delete('${r.operations.delete.path}', { params: { ${r.idParam}: id } })`;
  return `// ⚙️ Generado por QA Automation Agent desde OpenAPI
import type { APIRequestContext } from 'playwright';
import { ApiResponse, BaseApiClient } from '../clients/BaseApiClient';

export type ${model}Model = Record<string, unknown> & { ${r.idParam}: number };

export class ${pascal(r.name)}GenClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  create(body: ${model}Model): Promise<ApiResponse<${model}Model>> {
    return this.send(() => this.request.post('${r.operations.create.path}', { data: body }));
  }

  getById(id: number): Promise<ApiResponse<${model}Model>> {
    return this.send(() => this.request.get(\`${read}\`));
  }

  update(body: ${model}Model): Promise<ApiResponse<${model}Model>> {
    return this.send(() => ${update});
  }

  delete(id: number): Promise<ApiResponse<unknown>> {
    return this.send(() => ${del});
  }
}
`;
}

function renderRegistry(resources) {
  const imports = resources.map((r) => `import { ${pascal(r.name)}GenClient } from './${pascal(r.name)}GenClient';`).join('\n');
  const entries = resources
    .map(
      (r) => `  '${r.name}': {
    idField: '${r.idParam}',
    client: (request) => new ${pascal(r.name)}GenClient(request),
    schema: ${JSON.stringify(jsonSchemaFor(r), null, 2).replace(/\n/g, '\n    ')},
    build: (suffix) => (${samplePayloadCode(r, 'suffix', 'QA').replace(/\n/g, '\n    ')}),
    change: (created, suffix) => ({ ...created, ...(${samplePayloadCode(r, 'suffix', 'Actualizado').replace(/\n/g, '\n    ')}), ${r.idParam}: created.${r.idParam} }),
  },`,
    )
    .join('\n');
  return `// ⚙️ Generado por QA Automation Agent: recursos CRUD detectados en el OpenAPI
import type { APIRequestContext } from 'playwright';
import type { ApiResponse } from '../clients/BaseApiClient';
${imports}

type Body = Record<string, unknown> & { id?: number };

export interface CrudClient {
  create(body: any): Promise<ApiResponse<any>>;
  getById(id: number): Promise<ApiResponse<any>>;
  update(body: any): Promise<ApiResponse<any>>;
  delete(id: number): Promise<ApiResponse<unknown>>;
}

export interface CrudResource {
  idField: string;
  client: (request: APIRequestContext) => CrudClient;
  schema: object;
  build: (suffix: string) => Body;
  change: (created: Body, suffix: string) => Body;
}

export const crudResources: Record<string, CrudResource> = {
${entries}
};
`;
}

function renderSteps() {
  return `// ⚙️ Pasos CRUD genéricos para cualquier recurso registrado en src/api/generated
import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import Ajv from 'ajv';
import { crudResources } from '../../api/generated';
import { CustomWorld } from '../../support/world';

const ajv = new Ajv({ allErrors: true, strict: false });

function ctx(world: CustomWorld, name: string) {
  const resource = crudResources[name];
  if (!resource) throw new Error(\`Recurso "\${name}" no generado. Disponibles: \${Object.keys(crudResources).join(', ')}\`);
  const state = (world.apiState[name] ??= {}) as Record<string, any>;
  return { resource, client: resource.client(world.request!), state };
}

function record(world: CustomWorld, label: string, response: any, payload?: unknown) {
  world.lastResponse = response;
  world.attach(JSON.stringify({ request: label, payload, status: response.status, body: response.body }, null, 2), 'application/json');
}

Given('que tengo un nuevo recurso {string} con datos únicos', function (this: CustomWorld, name: string) {
  const { resource, state } = ctx(this, name);
  state.payload = resource.build(\`\${Date.now()}\`.slice(-8));
});

When('creo el recurso {string}', async function (this: CustomWorld, name: string) {
  const { client, state } = ctx(this, name);
  const res = await client.create(state.payload);
  record(this, \`POST \${name}\`, res, state.payload);
  if (res.ok) state.created = res.body;
});

Then('el status de la respuesta debe ser {int}', function (this: CustomWorld, status: number) {
  expect(this.lastResponse!.status, this.lastResponse!.rawText).toBe(status);
});

Then('la respuesta cumple el esquema de {string}', function (this: CustomWorld, name: string) {
  const { resource } = ctx(this, name);
  const validate = ajv.compile(resource.schema);
  expect(validate(this.lastResponse!.body), ajv.errorsText(validate.errors)).toBe(true);
});

Then('el recurso {string} creado tiene id generado y los datos enviados', function (this: CustomWorld, name: string) {
  const { resource, state } = ctx(this, name);
  expect(state.created[resource.idField]).toBeGreaterThan(0);
  const { [resource.idField]: _ignored, ...sent } = state.payload;
  expect(state.created).toMatchObject(sent);
});

When('consulto el recurso {string} creado', async function (this: CustomWorld, name: string) {
  const { resource, client, state } = ctx(this, name);
  record(this, \`GET \${name}\`, await client.getById(state.created[resource.idField]));
});

Then('el recurso {string} consultado corresponde al creado', function (this: CustomWorld, name: string) {
  expect(this.lastResponse!.body).toEqual(ctx(this, name).state.created);
});

When('actualizo el recurso {string} con datos nuevos', async function (this: CustomWorld, name: string) {
  const { resource, client, state } = ctx(this, name);
  state.updated = resource.change(state.created, \`\${Date.now()}\`.slice(-8));
  record(this, \`PUT \${name}\`, await client.update(state.updated), state.updated);
});

Then('la respuesta y una nueva consulta de {string} reflejan los cambios', async function (this: CustomWorld, name: string) {
  const { resource, client, state } = ctx(this, name);
  expect(this.lastResponse!.body).toEqual(state.updated);
  const again = await client.getById(state.created[resource.idField]);
  expect(again.body).toEqual(state.updated);
});

When('elimino el recurso {string} creado', async function (this: CustomWorld, name: string) {
  const { resource, client, state } = ctx(this, name);
  record(this, \`DELETE \${name}\`, await client.delete(state.created[resource.idField]));
});

When('consulto nuevamente el recurso {string} eliminado', async function (this: CustomWorld, name: string) {
  const { resource, client, state } = ctx(this, name);
  record(this, \`GET \${name} (post-delete)\`, await client.getById(state.created[resource.idField]));
});

Then('el recurso {string} no debe existir', function (this: CustomWorld, name: string) {
  const { resource, state } = ctx(this, name);
  const { status, body } = this.lastResponse!;
  const gone =
    [404, 204, 400].includes(status) ||
    (status === 200 && (body === null || body === '' || (body as any)?.[resource.idField] !== state.created[resource.idField]));
  expect(gone, \`Status=\${status} Body=\${this.lastResponse!.rawText}\`).toBe(true);
});
`;
}

function renderFeature(r, api) {
  const del = r.operations.delete.style === 'query' ? `${r.operations.delete.path}?${r.idParam}={${r.idParam}}` : r.operations.delete.path;
  return `# language: es
# ⚙️ Generado por QA Automation Agent desde ${api.title ?? 'OpenAPI'} (${api.source})
@api @generated @${r.name.toLowerCase()}
Característica: CRUD generado del recurso ${r.name}

  Escenario: Ciclo de vida CRUD de ${r.name}
    # BLOQUE 1: Creación - POST ${r.operations.create.path}
    Dado que tengo un nuevo recurso "${r.name}" con datos únicos
    Cuando creo el recurso "${r.name}"
    Entonces el status de la respuesta debe ser 200
    Y la respuesta cumple el esquema de "${r.name}"
    Y el recurso "${r.name}" creado tiene id generado y los datos enviados
    # BLOQUE 2: Consulta - GET ${r.operations.read.path}
    Cuando consulto el recurso "${r.name}" creado
    Entonces el status de la respuesta debe ser 200
    Y el recurso "${r.name}" consultado corresponde al creado
    # BLOQUE 3: Actualización - PUT ${r.operations.update.path}
    Cuando actualizo el recurso "${r.name}" con datos nuevos
    Entonces el status de la respuesta debe ser 200
    Y la respuesta y una nueva consulta de "${r.name}" reflejan los cambios
    # BLOQUE 4: Eliminación - DELETE ${del}
    Cuando elimino el recurso "${r.name}" creado
    Entonces el status de la respuesta debe ser 200
    # BLOQUE 5: Validación final
    Cuando consulto nuevamente el recurso "${r.name}" eliminado
    Entonces el recurso "${r.name}" no debe existir
`;
}

export function generateApiFiles({ api }) {
  const resources = api.resources.filter((r) => r.isFullCrud);
  const files = {};
  if (!resources.length) return { files, resources: [] };
  for (const r of resources) {
    files[`src/api/generated/${pascal(r.name)}GenClient.ts`] = renderClient(r);
    files[`features/generated/${r.name.toLowerCase()}_crud.feature`] = renderFeature(r, api);
  }
  files['src/api/generated/index.ts'] = renderRegistry(resources);
  files['src/steps/generated/generated-api.steps.ts'] = renderSteps();
  return { files, resources: resources.map((r) => r.name) };
}
