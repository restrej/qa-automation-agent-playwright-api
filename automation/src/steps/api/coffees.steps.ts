import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CoffeeBuilder, type Coffee } from '../../api/models/Coffee';
import { schemaErrors, validateCoffee } from '../../api/schemas/coffee.schema';
import { CustomWorld } from '../../support/world';

const MAX_RESPONSE_TIME_MS = Number(process.env.MAX_RESPONSE_TIME_MS ?? 5000);

function logExchange(world: CustomWorld, label: string, payload?: unknown): void {
  const r = world.lastResponse!;
  world.attach(
    JSON.stringify({ request: label, payload, status: r.status, durationMs: r.durationMs, body: r.body }, null, 2),
    'application/json',
  );
}

// ---------- BLOQUE 1: Creación ----------
Given(
  'que tengo un nuevo coffee con nombre único y descripción {string}',
  function (this: CustomWorld, description: string) {
    this.coffeePayload = CoffeeBuilder.aCoffee().withDescription(description).build();
  },
);

When('creo el coffee con POST \\/api\\/v1\\/Coffees', async function (this: CustomWorld) {
  this.lastResponse = await this.coffees.create(this.coffeePayload!);
  logExchange(this, 'POST /api/v1/Coffees', this.coffeePayload);
  if (this.lastResponse.ok) this.createdCoffee = this.lastResponse.body as Coffee;
});

Then('el código de respuesta debe ser {int}', function (this: CustomWorld, status: number) {
  expect(this.lastResponse!.status, this.lastResponse!.rawText).toBe(status);
  expect(this.lastResponse!.durationMs).toBeLessThan(MAX_RESPONSE_TIME_MS);
});

Then('la respuesta debe cumplir el esquema de Coffee', function (this: CustomWorld) {
  expect(this.lastResponse!.headers['content-type'] ?? '').toContain('application/json');
  expect(schemaErrors(validateCoffee, this.lastResponse!.body)).toBe('');
});

Then('el coffee creado debe tener un id generado y los datos enviados', function (this: CustomWorld) {
  const created = this.createdCoffee!;
  expect(created.id).toBeGreaterThan(0); // el servidor genera el id (enviamos 0)
  expect(created.name).toBe(this.coffeePayload!.name);
  expect(created.description).toBe(this.coffeePayload!.description);
  this.attach(`ID generado y persistido en el contexto: ${created.id}`, 'text/plain');
});

// ---------- BLOQUE 2: Consulta ----------
When('consulto el coffee creado con GET \\/api\\/v1\\/Coffees\\/\\{id}', async function (this: CustomWorld) {
  this.lastResponse = await this.coffees.getById(this.createdCoffee!.id);
  logExchange(this, `GET /api/v1/Coffees/${this.createdCoffee!.id}`);
});

Then('el coffee consultado debe corresponder al creado', function (this: CustomWorld) {
  expect(this.lastResponse!.body).toEqual(this.createdCoffee);
});

// ---------- BLOQUE 3: Actualización ----------
When(
  'actualizo el coffee con PUT \\/api\\/v1\\/Coffees con nombre {string} y descripción {string}',
  async function (this: CustomWorld, name: string, description: string) {
    this.updatedPayload = CoffeeBuilder.aCoffee()
      .withId(this.createdCoffee!.id)
      .withName(`${name} ${this.createdCoffee!.id}`)
      .withDescription(description)
      .build();
    this.lastResponse = await this.coffees.update(this.updatedPayload);
    logExchange(this, 'PUT /api/v1/Coffees', this.updatedPayload);
  },
);

Then('la respuesta debe reflejar los cambios enviados', function (this: CustomWorld) {
  expect(schemaErrors(validateCoffee, this.lastResponse!.body)).toBe('');
  expect(this.lastResponse!.body).toEqual(this.updatedPayload);
});

Then('al consultar nuevamente el coffee debe tener los datos actualizados', async function (this: CustomWorld) {
  const response = await this.coffees.getById(this.createdCoffee!.id);
  expect(response.status).toBe(200);
  expect(response.body).toEqual(this.updatedPayload);
});

// ---------- BLOQUE 4: Eliminación ----------
When('elimino el coffee con DELETE \\/api\\/v1\\/Coffees?id=\\{id}', async function (this: CustomWorld) {
  this.lastResponse = await this.coffees.delete(this.createdCoffee!.id);
  logExchange(this, `DELETE /api/v1/Coffees?id=${this.createdCoffee!.id}`);
});

// ---------- BLOQUE 5: Validación final ----------
When('consulto nuevamente el coffee eliminado', async function (this: CustomWorld) {
  this.lastResponse = await this.coffees.getById(this.createdCoffee!.id);
  logExchange(this, `GET /api/v1/Coffees/${this.createdCoffee!.id} (post-delete)`);
});

When('consulto el coffee con id {int}', async function (this: CustomWorld, id: number) {
  this.lastResponse = await this.coffees.getById(id);
  logExchange(this, `GET /api/v1/Coffees/${id}`);
});

/**
 * "Recurso no existe o respuesta esperada": se acepta 404/204/400,
 * o un 200 sin cuerpo / con un objeto que no corresponde al id consultado.
 */
Then('el recurso no debe existir', function (this: CustomWorld) {
  const { status, body } = this.lastResponse!;
  const notFoundStatus = [404, 204, 400].includes(status);
  const emptyBody = body === null || body === '' || (typeof body === 'object' && Object.keys(body as object).length === 0);
  const differentResource = this.createdCoffee ? (body as Coffee | null)?.id !== this.createdCoffee.id : true;
  expect(
    notFoundStatus || (status === 200 && (emptyBody || differentResource)),
    `Se esperaba que el recurso no existiera. Status=${status} Body=${this.lastResponse!.rawText}`,
  ).toBe(true);
});
