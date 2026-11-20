import { chromium } from 'playwright';
import { extractPage } from './pageExtractor.js';

const PRIORITY = [
  { re: /register|signup|sign-up|registro|crear-cuenta/i, weight: 100 },
  { re: /login|signin|sign-in|ingresar/i, weight: 90 },
  { re: /cart|carrito|basket/i, weight: 85 },
  { re: /checkout/i, weight: 80 },
  { re: /search|buscar/i, weight: 40 },
  { re: /contact/i, weight: 30 },
];

/** Clasifica la página según su contenido (para decidir qué casos generar). */
export function classifyPage(p) {
  const path = p.path.toLowerCase();
  const formText = JSON.stringify(p.forms.map((f) => f.fields.map((x) => x.label + x.name))).toLowerCase();
  if (p.passwordFields >= 2 || /register|signup|registro/.test(path)) return 'register';
  if (p.passwordFields === 1 || /login|signin/.test(path)) return 'login';
  if (p.hasCartTable || /\/cart/.test(path)) return 'cart';
  if (/checkout/.test(path)) return 'checkout';
  if (p.addToCartButtons.length && !p.hasProductGrid) return 'product';
  if (p.hasProductGrid) return path === '/' ? 'home' : 'category';
  if (path === '/' || path === '') return 'home';
  if (/search/.test(path) || /search/.test(formText)) return 'search';
  return 'generic';
}

function scoreLink(link) {
  const target = `${link.href} ${link.text}`;
  return PRIORITY.reduce((acc, p) => (p.re.test(target) ? Math.max(acc, p.weight) : acc), 0);
}

export async function launchBrowser() {
  const channel = process.env.AGENT_BROWSER_CHANNEL || undefined;
  try {
    return await chromium.launch({ headless: process.env.AGENT_HEADLESS !== 'false', channel });
  } catch (err) {
    if (!channel) {
      // Fallback al Chrome instalado si no se descargaron los navegadores de Playwright
      try {
        return await chromium.launch({ headless: process.env.AGENT_HEADLESS !== 'false', channel: 'chrome' });
      } catch {
        /* se lanza el error original */
      }
    }
    throw new Error(
      `No se pudo abrir el navegador del analizador. Ejecuta "npx playwright install chromium" en /agent ` +
        `o define AGENT_BROWSER_CHANNEL=chrome. Detalle: ${err.message}`,
    );
  }
}

/**
 * Recorre el sitio (mismo dominio) priorizando registro, login, carrito y categorías.
 * @returns análisis con páginas, formularios, categorías y flujos detectados.
 */
export async function analyzeSite({ url, maxPages = 6, log = () => {} }) {
  const start = new URL(url);
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-US' });
  const page = await context.newPage();
  const visited = new Set();
  const pages = [];
  const queue = [{ href: start.href, score: 1000, reason: 'Página inicial' }];

  try {
    while (queue.length && pages.length < maxPages) {
      queue.sort((a, b) => b.score - a.score);
      const next = queue.shift();
      const key = next.href.split('#')[0];
      if (visited.has(key)) continue;
      visited.add(key);

      log(`Analizando ${key} (${next.reason})`);
      try {
        const response = await page.goto(key, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (response && response.status() >= 400) {
          log(`  ⚠ HTTP ${response.status()}, se omite`);
          continue;
        }
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
      } catch (err) {
        log(`  ⚠ No se pudo abrir: ${err.message.split('\n')[0]}`);
        continue;
      }
      const data = await page.evaluate(extractPage);
      data.kind = classifyPage(data);
      data.reason = next.reason;
      pages.push(data);
      log(`  ✓ ${data.kind} · ${data.forms.length} formularios · ${data.categories.length} categorías`);

      for (const link of data.links) {
        if (!link.href.startsWith(start.origin)) continue;
        const s = scoreLink(link);
        if (s > 0) queue.push({ href: link.href, score: s, reason: `Enlace "${link.text}"` });
      }
      // Primera categoría con subcategoría y su primer producto -> página de producto/categoría
      const cat = data.categories.find((c) => c.subcategories.length) ?? data.categories[0];
      if (cat) {
        const sub = cat.subcategories[0];
        queue.push({ href: (sub ?? cat).href, score: 60, reason: `Categoría ${cat.name}${sub ? ' > ' + sub.name : ''}` });
      }
      if (data.kind === 'category') {
        const productLink = data.links.find((l) => /product|\/[a-z0-9-]{6,}$/i.test(l.href) && l.text.length > 6);
        if (productLink) queue.push({ href: productLink.href, score: 55, reason: `Producto "${productLink.text}"` });
      }
    }
  } finally {
    await browser.close();
  }

  const categories = pages.find((p) => p.categories.length)?.categories ?? [];
  const has = (kind) => pages.some((p) => p.kind === kind);
  const flows = {
    registro: has('register'),
    login: has('login'),
    navegacionCategorias: categories.length > 0,
    compra: (has('cart') || pages.some((p) => p.addToCartButtons.length)) && categories.length > 0,
  };
  log(`Flujos detectados: ${Object.entries(flows).filter(([, v]) => v).map(([k]) => k).join(', ') || 'ninguno'}`);

  return {
    url: start.href,
    origin: start.origin,
    analyzedAt: new Date().toISOString(),
    pages,
    categories,
    flows,
  };
}
