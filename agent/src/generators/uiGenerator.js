/**
 * Genera código de automatización UI (Playwright + TypeScript + Cucumber + POM)
 * a partir del análisis del sitio:
 *  - Un Page Object por página analizada (src/pages/generated) con los localizadores recomendados
 *  - Un registro de páginas y pasos genéricos reutilizables
 *  - Features esqueleto (@wip) por formulario detectado
 *  - El feature E2E de compra parametrizado con los datos configurados en el agente
 */
import { DEFAULT_TEST_DATA } from './jiraGenerator.js';

const pascal = (s) =>
  (s || 'Page')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Page';
const camel = (s) => {
  const p = pascal(s);
  const c = p[0].toLowerCase() + p.slice(1);
  return /^\d/.test(c) ? `f${c}` : c;
};
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function pageClassName(p, used) {
  const fromPath = p.path === '/' ? 'Home' : p.path.split('/').filter(Boolean).slice(-1)[0];
  let base = `${pascal(fromPath)}GenPage`;
  let i = 2;
  while (used.has(base)) base = `${pascal(fromPath)}${i++}GenPage`;
  used.add(base);
  return base;
}

const fieldKind = (f) => (f.tag === 'select' ? 'select' : f.type === 'checkbox' ? 'checkbox' : f.type === 'radio' ? 'radio' : 'text');
const fieldKey = (f) => (f.label || f.name || f.htmlName || f.id || f.type).replace(/[:*]/g, '').trim();

function renderPage(p, className) {
  const props = new Map();
  const uniqueProp = (name) => {
    let n = camel(name) || 'element';
    let i = 2;
    while (props.has(n)) n = `${camel(name)}${i++}`;
    return n;
  };
  const decl = [];
  const init = [];
  const forms = [];
  p.forms.slice(0, 5).forEach((form, fi) => {
    const fieldEntries = [];
    for (const f of form.fields) {
      const prop = uniqueProp(fieldKey(f));
      props.set(prop, true);
      decl.push(`  /** ${f.locator.strategy} · ${f.tag}[type=${f.type}]${f.required ? ' · obligatorio' : ''} */\n  readonly ${prop}: Locator;`);
      init.push(`    this.${prop} = ${f.locator.code};`);
      fieldEntries.push(`        '${esc(fieldKey(f))}': { locator: this.${prop}, kind: '${fieldKind(f)}' },`);
    }
    const btn = form.buttons[0];
    let submitProp = 'undefined';
    if (btn) {
      submitProp = uniqueProp(`${btn.name || 'submit'} button`);
      props.set(submitProp, true);
      decl.push(`  /** ${btn.locator.strategy} */\n  readonly ${submitProp}: Locator;`);
      init.push(`    this.${submitProp} = ${btn.locator.code};`);
      submitProp = `this.${submitProp}`;
    }
    forms.push(`      {\n        name: '${esc(form.heading || form.id || `Formulario ${fi + 1}`)}',\n        fields: {\n${fieldEntries.join('\n')}\n        },\n        submit: ${submitProp},\n      },`);
  });

  return `// ⚙️ Generado por QA Automation Agent a partir de ${p.url}
// Clasificación: ${p.kind} · Título: ${p.title}
// Revisa los localizadores marcados como "css": son el último recurso y conviene pedir un data-testid.
import type { Locator, Page } from 'playwright';
import { BasePage } from '../BasePage';
import type { GeneratedForm, GeneratedPage } from './types';

export class ${className} extends BasePage implements GeneratedPage {
  static readonly path = '${esc(p.path)}';
  readonly forms: GeneratedForm[];

${decl.join('\n') || '  // No se detectaron formularios en esta página'}

  constructor(page: Page) {
    super(page);
${init.join('\n')}
    this.forms = [
${forms.join('\n')}
    ];
  }

  async goto(): Promise<void> {
    await this.open(${className}.path);
  }
}
`;
}

function renderTypes() {
  return `import type { Locator } from 'playwright';

export type FieldKind = 'text' | 'select' | 'checkbox' | 'radio';

export interface GeneratedField {
  locator: Locator;
  kind: FieldKind;
}

export interface GeneratedForm {
  name: string;
  fields: Record<string, GeneratedField>;
  submit?: Locator;
}

export interface GeneratedPage {
  forms: GeneratedForm[];
  goto(): Promise<void>;
}
`;
}

function renderRegistry(entries) {
  return `// ⚙️ Generado por QA Automation Agent: registro nombre -> Page Object
import type { Page } from 'playwright';
import type { GeneratedPage } from './types';
${entries.map((e) => `import { ${e.className} } from './${e.className}';`).join('\n')}

export const generatedPages: Record<string, (page: Page) => GeneratedPage> = {
${entries.map((e) => `  '${esc(e.label)}': (page) => new ${e.className}(page),`).join('\n')}
};
`;
}

function renderGenericSteps() {
  return `// ⚙️ Pasos genéricos para los Page Objects generados (src/pages/generated)
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { generatedPages } from '../../pages/generated';
import type { GeneratedPage } from '../../pages/generated/types';
import { CustomWorld } from '../../support/world';

function resolve(world: CustomWorld, name: string): GeneratedPage {
  const factory = generatedPages[name];
  if (!factory) throw new Error(\`Página generada "\${name}" no registrada. Disponibles: \${Object.keys(generatedPages).join(', ')}\`);
  return factory(world.page!);
}

Given('que el usuario abre la página generada {string}', async function (this: CustomWorld, name: string) {
  await resolve(this, name).goto();
});

When('diligencia en la página {string} el formulario {int} con:', async function (this: CustomWorld, name: string, index: number, table: DataTable) {
  const form = resolve(this, name).forms[index - 1];
  for (const [label, value] of Object.entries(table.rowsHash())) {
    const field = form.fields[label];
    if (!field) throw new Error(\`Campo "\${label}" no existe. Campos: \${Object.keys(form.fields).join(', ')}\`);
    if (field.kind === 'select') await field.locator.selectOption({ label: value });
    else if (field.kind === 'checkbox' || field.kind === 'radio') await field.locator.setChecked(/^(true|si|sí|x|yes)$/i.test(value));
    else await field.locator.fill(value);
  }
});

When('envía en la página {string} el formulario {int}', async function (this: CustomWorld, name: string, index: number) {
  const form = resolve(this, name).forms[index - 1];
  if (!form.submit) throw new Error('El formulario no tiene botón de envío detectado');
  await form.submit.click();
});

Then('la página debe mostrar el texto {string}', async function (this: CustomWorld, text: string) {
  await expect(this.page!.getByText(text).first()).toBeVisible();
});
`;
}

function renderGeneratedFeature(p, label) {
  const scenarios = p.forms.slice(0, 5).map((form, i) => {
    const rows = form.fields
      .filter((f) => f.type !== 'hidden')
      .slice(0, 15)
      .map((f) => `      | ${fieldKey(f).replace(/\|/g, '/')} | ${f.tag === 'select' ? f.value || '<opción>' : f.type === 'checkbox' || f.type === 'radio' ? 'true' : '<valor>'} |`);
    return `  Escenario: Diligenciar el formulario "${form.heading || form.id || i + 1}"
    Dado que el usuario abre la página generada "${label}"
    Cuando diligencia en la página "${label}" el formulario ${i + 1} con:
${rows.join('\n')}
    Y envía en la página "${label}" el formulario ${i + 1}
    Entonces la página debe mostrar el texto "<resultado esperado>"`;
  });
  return `# language: es
# ⚙️ Esqueleto generado por QA Automation Agent (${p.url}).
# Completa los <valores> y el resultado esperado y luego quita el tag @wip.
@ui @generated @wip
Característica: Formularios de la página ${label}

${scenarios.join('\n\n')}
`;
}

/** Feature E2E de compra con los datos parametrizados desde el agente. */
export function renderPurchaseFeature(data = DEFAULT_TEST_DATA) {
  const b = data.billing;
  const c = data.card;
  const p = data.purchase;
  const pad = (k, v, w = 18) => `      | ${k.padEnd(w)} | ${String(v)} |`;
  return `# language: es
# ⚙️ Generado por QA Automation Agent con los datos de prueba configurados
@ui @compra
Característica: Proceso de compra con tarjeta de crédito
  Como cliente registrado de Demo Web Shop
  Quiero comprar un producto pagando con tarjeta de crédito
  Para recibirlo en mi dirección de entrega

  Antecedentes:
    Dado que el usuario se encuentra en la página de inicio de Demo Web Shop
    Y se registra con datos válidos y un correo único
    Y debe ver el mensaje de registro "Your registration completed"

  @smoke @e2e
  Esquema del escenario: Compra exitosa de "<producto>" pagando con tarjeta ${c.type}
    Cuando navega a la categoría "<categoria>" y subcategoría "<subcategoria>"
    Y agrega el producto "<producto>" al carrito
    Y ingresa al carrito y da clic en Checkout
    Y diligencia la dirección de facturación con los datos:
${pad('Company', b.company)}
${pad('Country', b.country)}
${pad('State / province', b.stateProvince)}
${pad('City', b.city)}
${pad('Address 1', b.address1)}
${pad('Address 2', b.address2)}
${pad('Zip / postal code', b.zipPostalCode)}
${pad('Phone number', b.phoneNumber)}
${pad('Fax number', b.faxNumber)}
    Y deja por defecto la dirección y el método de envío
    Y selecciona "Credit Card" como método de pago
    Y completa la información de pago con los datos:
${pad('Select credit card', c.type)}
${pad('Cardholder name', c.holderName)}
${pad('Card number', c.number)}
${pad('Expiration date', c.expiration)}
${pad('Card code', c.code)}
    Y confirma la orden
    Entonces debe ver el mensaje "${data.successMessage}"
    Y debe generarse un número de orden

    Ejemplos:
      | categoria | subcategoria | producto |
      | ${p.category} | ${p.subcategory ?? ''} | ${p.product} |
`;
}

export function generateUiFiles({ site, testData, options = {} }) {
  const files = {};
  const used = new Set();
  const entries = [];
  for (const p of site.pages) {
    const className = pageClassName(p, used);
    const label = className.replace(/GenPage$/, '');
    entries.push({ className, label, page: p });
    files[`src/pages/generated/${className}.ts`] = renderPage(p, className);
    if (p.forms.length && options.formularios !== false) {
      files[`features/generated/${label.toLowerCase()}.feature`] = renderGeneratedFeature(p, label);
    }
  }
  files['src/pages/generated/types.ts'] = renderTypes();
  files['src/pages/generated/index.ts'] = renderRegistry(entries);
  files['src/steps/generated/generated-ui.steps.ts'] = renderGenericSteps();
  if (site.flows.compra && options.compra !== false) files['features/ui/compra.feature'] = renderPurchaseFeature(testData);

  const locatorStats = {};
  for (const p of site.pages)
    for (const f of p.forms.flatMap((x) => [...x.fields, ...x.buttons])) locatorStats[f.locator.strategy] = (locatorStats[f.locator.strategy] ?? 0) + 1;
  return { files, pages: entries.map((e) => ({ className: e.className, label: e.label, url: e.page.url, kind: e.page.kind })), locatorStats };
}
