import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { Browser, chromium, firefox, request, webkit } from 'playwright';
import { CoffeeClient } from '../api/clients/CoffeeClient';
import { env } from '../config/env';
import { CustomWorld } from './world';

setDefaultTimeout(env.defaultTimeout * 4);

let browser: Browser | undefined;
const launchers = { chromium, firefox, webkit };

/** El navegador solo se lanza si se va a ejecutar al menos un escenario @ui. */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await launchers[env.browser].launch({
      headless: env.headless,
      slowMo: env.slowMo,
      channel: env.channel,
    });
  }
  return browser;
}

BeforeAll(function () {
  console.log(`\n▶ Navegador: ${env.browser}${env.channel ? ` (${env.channel})` : ''} | headless=${env.headless}`);
});

Before({ tags: '@ui' }, async function (this: CustomWorld) {
  const b = await getBrowser();
  this.context = await b.newContext({
    baseURL: env.baseUrl,
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
  });
  this.context.setDefaultTimeout(env.defaultTimeout);
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
});

Before({ tags: '@api' }, async function (this: CustomWorld) {
  this.request = await request.newContext({
    baseURL: env.apiBaseUrl,
    extraHTTPHeaders: { Accept: 'application/json', 'Content-Type': 'application/json' },
    timeout: env.defaultTimeout,
  });
  this.coffeeClient = new CoffeeClient(this.request);
});

After({ tags: '@ui' }, async function (this: CustomWorld, { result, pickle }) {
  if (this.page) {
    // Evidencia: captura final siempre; trace solo en fallo
    const png = await this.page.screenshot({ fullPage: true }).catch(() => undefined);
    if (png) await this.attach(png, 'image/png');
    if (result?.status === Status.FAILED && this.context) {
      const safe = pickle.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      await this.context.tracing.stop({ path: `test-results/traces/${env.browser}-${safe}.zip` });
    } else {
      await this.context?.tracing.stop();
    }
  }
  await this.context?.close();
});

After({ tags: '@api' }, async function (this: CustomWorld) {
  // Limpieza defensiva: si el escenario falló antes del DELETE, borramos el recurso
  const id = this.createdCoffee?.id;
  if (id && this.coffeeClient && !this.coffeeClient.wasDeleted(id)) {
    await this.coffeeClient.delete(id).catch(() => undefined);
  }
  await this.request?.dispose();
});

AfterAll(async function () {
  await browser?.close();
});
