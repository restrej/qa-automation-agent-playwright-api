/**
 * Genera casos de prueba en formato Jira (compatible con importación CSV de Jira y de Xray).
 * Fuentes: análisis del sitio (formularios, categorías, carrito), flujos E2E detectados y recursos CRUD de la API.
 */

export const DEFAULT_TEST_DATA = {
  billing: {
    company: 'Empresa Demo QA',
    country: 'Colombia',
    stateProvince: 'Other (Non US)',
    city: 'Medellín',
    address1: 'calle 14 # 6-51',
    address2: 'Carrera 17 # 3-56',
    zipPostalCode: '12315',
    phoneNumber: '3177777777',
    faxNumber: '15464',
  },
  card: {
    type: 'Visa',
    holderName: 'Barbara Gordon',
    number: '4485564059489345',
    expiration: '04/2039',
    code: '123',
  },
  purchase: { category: 'Computers', subcategory: 'Notebooks', product: '14.1-inch Laptop' },
  successMessage: 'Your order has been successfully processed!',
};

const step = (action, data = '', expected = '') => ({ action, data, expected });

function makeCase(base) {
  return {
    issueType: 'Test',
    priority: 'Medium',
    testType: 'Manual',
    labels: [],
    precondition: '',
    automation: 'UI',
    ...base,
  };
}

const fieldName = (f) => (f.label || f.name || f.htmlName || f.id || f.type).replace(/[:*]/g, '').trim();

function registerCases(page, site) {
  const form = page.forms.find((f) => f.fields.filter((x) => x.type === 'password').length >= 2) ?? page.forms[0];
  const fields = form?.fields ?? [];
  const required = fields.filter((f) => f.required).map(fieldName);
  const listFields = fields.filter((f) => f.type !== 'radio').map(fieldName).join(', ');
  const component = 'Registro';
  return [
    makeCase({
      summary: 'Registro exitoso de un usuario nuevo con datos válidos',
      priority: 'Highest',
      component,
      labels: ['registro', 'smoke', 'automatizado'],
      feature: 'features/ui/registro.feature',
      precondition: `El usuario no está autenticado y navega en ${site.origin}`,
      description: `Validar que un visitante puede crear una cuenta diligenciando: ${listFields}.`,
      steps: [
        step('Ingresar a la página de inicio y dar clic en "Register"', site.origin, 'Se muestra el formulario de registro'),
        step('Seleccionar género y diligenciar nombre, apellido, correo único y contraseña', 'Jose Elver / Arturo / correo único / Qa#123456', 'Los campos aceptan los datos'),
        step('Confirmar la contraseña y dar clic en "Register"', '', 'Se muestra el mensaje "Your registration completed"'),
        step('Verificar la cabecera', '', 'Se ve el correo del usuario y el enlace "Log out"'),
      ],
    }),
    makeCase({
      summary: 'Registro fallido con campos obligatorios vacíos',
      priority: 'High',
      component,
      labels: ['registro', 'negativo', 'automatizado'],
      feature: 'features/ui/registro.feature',
      description: `Validar los mensajes de obligatoriedad. Campos obligatorios detectados: ${required.join(', ') || listFields}.`,
      steps: [
        step('Ingresar a la página de registro', `${site.origin}${page.path}`, 'Se muestra el formulario'),
        step('Dar clic en "Register" sin diligenciar datos', '', 'Se muestran mensajes "... is required." en cada campo obligatorio'),
      ],
    }),
    makeCase({
      summary: 'Registro fallido con correo electrónico de formato inválido',
      component,
      labels: ['registro', 'negativo'],
      steps: [
        step('Diligenciar el formulario con un correo sin formato válido', 'correo: usuario@@dominio', ''),
        step('Dar clic en "Register"', '', 'Se muestra el mensaje "Wrong email" y no se crea la cuenta'),
      ],
    }),
    makeCase({
      summary: 'Registro fallido cuando la confirmación de contraseña no coincide',
      component,
      labels: ['registro', 'negativo'],
      steps: [
        step('Diligenciar el formulario con contraseñas diferentes', 'Password: Qa#123456 / Confirm: Qa#654321', ''),
        step('Dar clic en "Register"', '', 'Se muestra el mensaje de que las contraseñas no coinciden'),
      ],
    }),
    makeCase({
      summary: 'Registro fallido con un correo ya registrado',
      component,
      labels: ['registro', 'negativo'],
      precondition: 'Existe un usuario registrado con el correo a utilizar',
      steps: [
        step('Diligenciar el formulario con un correo existente', 'correo existente', ''),
        step('Dar clic en "Register"', '', 'Se muestra "The specified email already exists"'),
      ],
    }),
  ];
}

function loginCases(page, site) {
  return [
    makeCase({
      summary: 'Inicio de sesión exitoso con credenciales válidas',
      priority: 'High',
      component: 'Autenticación',
      labels: ['login', 'smoke'],
      precondition: 'Existe un usuario registrado',
      steps: [
        step('Ingresar a la página de login', `${site.origin}${page.path}`, 'Se muestra el formulario de login'),
        step('Diligenciar correo y contraseña válidos y dar clic en "Log in"', 'usuario registrado', 'El usuario queda autenticado y ve su correo en la cabecera'),
      ],
    }),
    makeCase({
      summary: 'Inicio de sesión fallido con contraseña incorrecta',
      component: 'Autenticación',
      labels: ['login', 'negativo'],
      steps: [
        step('Diligenciar correo válido y contraseña incorrecta', '', ''),
        step('Dar clic en "Log in"', '', 'Se muestra un mensaje de login no exitoso y no se autentica'),
      ],
    }),
  ];
}

function navigationCases(site) {
  return site.categories.slice(0, 8).map((cat) => {
    const sub = cat.subcategories[0];
    return makeCase({
      summary: sub ? `Navegación por categoría "${cat.name}" > subcategoría "${sub.name}"` : `Navegación por categoría "${cat.name}"`,
      priority: 'Low',
      component: 'Catálogo',
      labels: ['navegacion', 'catalogo'],
      steps: [
        step('Ingresar a la página de inicio', site.origin, 'Se muestra el menú superior de categorías'),
        sub
          ? step(`Posicionarse sobre "${cat.name}" y dar clic en "${sub.name}"`, '', `Se muestra el listado de productos de "${sub.name}"`)
          : step(`Dar clic en la categoría "${cat.name}"`, '', `Se muestra el listado de productos de "${cat.name}"`),
      ],
    });
  });
}

function purchaseCases(site, data) {
  const b = data.billing;
  const c = data.card;
  const p = data.purchase;
  return [
    makeCase({
      summary: `Compra exitosa de "${p.product}" pagando con tarjeta de crédito ${c.type}`,
      priority: 'Highest',
      component: 'Checkout',
      labels: ['compra', 'e2e', 'smoke', 'automatizado'],
      feature: 'features/ui/compra.feature',
      precondition: 'Usuario recién registrado y autenticado con el carrito vacío',
      description:
        'Flujo E2E: registro > categoría > subcategoría > producto > carrito > checkout > pago con tarjeta > confirmación. ' +
        'Validaciones: registro exitoso y mensaje final de compra.',
      steps: [
        step('Registrar un usuario nuevo', 'correo único', 'Se muestra "Your registration completed"'),
        step(`Ir a la categoría "${p.category}"${p.subcategory ? ` > "${p.subcategory}"` : ''}`, '', 'Se listan los productos'),
        step(`Agregar el producto "${p.product}" al carrito`, 'Cantidad: 1', 'Se muestra "The product has been added to your shopping cart"'),
        step('Ingresar al carrito, aceptar términos y dar clic en "Checkout"', '', 'Se abre el checkout en el paso "Billing address"'),
        step(
          'Diligenciar la dirección de facturación (nombre, apellido y correo quedan por defecto)',
          `Company: ${b.company} | Country: ${b.country} | State: ${b.stateProvince} | City: ${b.city} | Address 1: ${b.address1} | Address 2: ${b.address2} | Zip: ${b.zipPostalCode} | Phone: ${b.phoneNumber} | Fax: ${b.faxNumber}`,
          'Se habilita el paso "Shipping address"',
        ),
        step('Continuar con la dirección y el método de envío por defecto', '', 'Se habilita "Payment method"'),
        step('Seleccionar "Credit Card" como método de pago', '', 'Se habilita "Payment information"'),
        step(
          'Completar la información de pago',
          `Select credit card: ${c.type} | Cardholder name: ${c.holderName} | Card number: ${c.number} | Expiration date: ${c.expiration} | Card code: ${c.code}`,
          'Se habilita "Confirm order"',
        ),
        step('Dar clic en "Confirm"', '', `Se muestra "${data.successMessage}" y un número de orden`),
      ],
    }),
    makeCase({
      summary: 'Checkout bloqueado si no se aceptan los términos del servicio',
      component: 'Checkout',
      labels: ['compra', 'negativo'],
      precondition: 'Usuario autenticado con al menos un producto en el carrito',
      steps: [
        step('Ingresar al carrito', '', 'Se lista el producto agregado'),
        step('Dar clic en "Checkout" sin marcar "I agree with the terms of service"', '', 'Se muestra la alerta de términos y no avanza al checkout'),
      ],
    }),
    makeCase({
      summary: 'Pago rechazado por número de tarjeta inválido',
      component: 'Checkout',
      labels: ['compra', 'negativo'],
      precondition: 'Usuario en el paso "Payment information"',
      steps: [
        step('Diligenciar la tarjeta con un número inválido', 'Card number: 1234567890123456', ''),
        step('Dar clic en "Continue"', '', 'Se muestra "Wrong card number" y no avanza a la confirmación'),
      ],
    }),
  ];
}

function genericFormCases(page, site) {
  return page.forms.slice(0, 2).map((form) => {
    const fields = form.fields.map(fieldName).filter(Boolean);
    const submit = form.buttons[0]?.name || 'Enviar';
    return makeCase({
      summary: `Envío del formulario "${form.heading || form.id || submit}" en ${page.title || page.path}`,
      priority: 'Low',
      component: 'Formularios',
      labels: ['formulario', page.kind],
      description: `Campos detectados: ${fields.join(', ')}`,
      steps: [
        step('Ingresar a la página', `${site.origin}${page.path}`, 'Se muestra el formulario'),
        step('Diligenciar los campos con datos válidos', fields.join(', '), ''),
        step(`Dar clic en "${submit}"`, '', 'El formulario se procesa sin errores de validación'),
      ],
    });
  });
}

function apiCases(api) {
  const cases = [];
  for (const r of api.resources.filter((x) => x.isFullCrud)) {
    const s = r.schemaName;
    const comp = `API ${r.name}`;
    const labels = ['api', 'crud', r.name.toLowerCase(), 'automatizado'];
    const delPath = r.operations.delete.style === 'query' ? `${r.operations.delete.path}?${r.idParam}={${r.idParam}}` : r.operations.delete.path;
    const feature = `features/api/${r.name.toLowerCase()}_crud.feature`;
    cases.push(
      makeCase({
        automation: 'API',
        summary: `[API] Ciclo de vida CRUD completo del recurso ${r.name}`,
        priority: 'Highest',
        component: comp,
        labels: [...labels, 'smoke'],
        feature,
        precondition: `API disponible en ${api.baseUrl}`,
        description: `Bloques: 1) Creación 2) Consulta 3) Actualización 4) Eliminación 5) Validación final. Esquema: ${s} (${Object.keys(r.schema.properties).join(', ')}).`,
        steps: [
          step(`BLOQUE 1 - POST ${r.operations.create.path}`, `{ "id": 0, ${Object.keys(r.schema.properties).filter((k) => k !== 'id').map((k) => `"${k}": "<único>"`).join(', ')} }`, 'Status 200, estructura válida según el esquema y se persiste el ID generado'),
          step(`BLOQUE 2 - GET ${r.operations.read.path}`, 'id generado', 'Status 200, el objeto corresponde al creado y los campos son correctos'),
          step(`BLOQUE 3 - PUT ${r.operations.update.path}`, 'mismo id con nuevos valores', 'Status 200 y los cambios se reflejan (respuesta y nueva consulta)'),
          step(`BLOQUE 4 - DELETE ${delPath}`, 'id generado', 'Status 200'),
          step(`BLOQUE 5 - GET ${r.operations.read.path}`, 'id eliminado', 'El recurso no existe (404/204 o respuesta vacía)'),
        ],
      }),
      makeCase({
        automation: 'API',
        summary: `[API] Consultar un ${s} inexistente`,
        component: comp,
        labels: ['api', 'negativo', r.name.toLowerCase(), 'automatizado'],
        feature,
        steps: [step(`GET ${r.operations.read.path}`, `${r.idParam} = 2147483000`, 'El recurso no existe (404/204 o respuesta vacía)')],
      }),
      makeCase({
        automation: 'API',
        summary: `[API] Crear ${s} con propiedades no permitidas por el contrato`,
        component: comp,
        labels: ['api', 'negativo', 'contrato', r.name.toLowerCase()],
        description: r.schema.additionalProperties === false ? 'El esquema declara additionalProperties: false.' : '',
        steps: [step(`POST ${r.operations.create.path}`, '{ "id": 0, "campoInexistente": "x" }', 'La API rechaza la petición (4xx) o ignora la propiedad sin persistirla')],
      }),
    );
  }
  return cases;
}

/** Punto de entrada: arma la lista de casos y les asigna llaves TC-001, TC-002... */
export function generateJiraCases({ site, api, testData = DEFAULT_TEST_DATA, options = {} }) {
  const opts = { registro: true, compra: true, navegacion: true, formularios: true, api: true, ...options };
  const cases = [];
  if (site) {
    const register = site.pages.find((p) => p.kind === 'register');
    const login = site.pages.find((p) => p.kind === 'login');
    if (opts.registro && register) cases.push(...registerCases(register, site));
    if (opts.registro && login) cases.push(...loginCases(login, site));
    if (opts.compra && site.flows.compra) cases.push(...purchaseCases(site, testData));
    if (opts.navegacion) cases.push(...navigationCases(site));
    if (opts.formularios) {
      for (const p of site.pages.filter((x) => ['generic', 'search', 'home'].includes(x.kind))) cases.push(...genericFormCases(p, site));
    }
  }
  if (api && opts.api) cases.push(...apiCases(api));
  return cases.map((c, i) => ({ key: `TC-${String(i + 1).padStart(3, '0')}`, ...c }));
}

// ---------------- Exportadores ----------------
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvRow = (cells) => cells.map(csvCell).join(',');

/** CSV para Xray (Test Case Importer): una fila por paso, agrupadas por "TCID". */
export function toXrayCsv(cases) {
  const header = ['TCID', 'Summary', 'Issue Type', 'Priority', 'Component', 'Labels', 'Description', 'Precondition', 'Test Type', 'Action', 'Data', 'Expected Result'];
  const rows = [csvRow(header)];
  for (const c of cases) {
    c.steps.forEach((s, i) => {
      rows.push(
        csvRow(
          i === 0
            ? [c.key, c.summary, c.issueType, c.priority, c.component, c.labels.join(' '), c.description ?? '', c.precondition, c.testType, s.action, s.data, s.expected]
            : [c.key, '', '', '', '', '', '', '', '', s.action, s.data, s.expected],
        ),
      );
    });
  }
  return rows.join('\n');
}

/** CSV para el importador nativo de Jira: una fila por caso con los pasos en tabla wiki. */
export function toJiraCsv(cases) {
  const header = ['Summary', 'Issue Type', 'Priority', 'Component/s', 'Labels', 'Labels', 'Labels', 'Labels', 'Description'];
  const rows = [csvRow(header)];
  for (const c of cases) {
    const labels = [...c.labels, `auto-${c.automation.toLowerCase()}`].slice(0, 4);
    while (labels.length < 4) labels.push('');
    const table = ['||#||Acción||Datos||Resultado esperado||', ...c.steps.map((s, i) => `|${i + 1}|${s.action || ' '}|${s.data || ' '}|${s.expected || ' '}|`)].join('\n');
    const description = [
      `*ID:* ${c.key}`,
      c.description ? `*Objetivo:* ${c.description}` : '',
      c.precondition ? `*Precondición:* ${c.precondition}` : '',
      c.feature ? `*Automatización:* {{${c.feature}}}` : '',
      '',
      table,
    ]
      .filter((l) => l !== '')
      .join('\n');
    rows.push(csvRow([c.summary, c.issueType, c.priority, c.component, ...labels, description]));
  }
  return rows.join('\n');
}

export function toMarkdown(cases) {
  const out = ['# Casos de prueba generados', ''];
  for (const c of cases) {
    out.push(`## ${c.key} · ${c.summary}`, '', `**Prioridad:** ${c.priority} · **Componente:** ${c.component} · **Tipo:** ${c.automation} · **Labels:** ${c.labels.join(', ')}`, '');
    if (c.precondition) out.push(`**Precondición:** ${c.precondition}`, '');
    if (c.description) out.push(`**Descripción:** ${c.description}`, '');
    out.push('| # | Acción | Datos | Resultado esperado |', '|---|---|---|---|');
    c.steps.forEach((s, i) => out.push(`| ${i + 1} | ${s.action} | ${s.data.replace(/\|/g, '\\|')} | ${s.expected} |`));
    out.push('');
  }
  return out.join('\n');
}
