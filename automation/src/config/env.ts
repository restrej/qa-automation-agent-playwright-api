import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

export type BrowserName = 'chromium' | 'firefox' | 'webkit';

/** Normaliza el nombre recibido (chrome, chromium, firefox, webkit, safari). */
function resolveBrowser(raw: string | undefined): { name: BrowserName; channel?: string } {
  const value = (raw ?? 'chromium').toLowerCase().trim();
  switch (value) {
    case 'chrome':
      return { name: 'chromium', channel: 'chrome' };
    case 'edge':
    case 'msedge':
      return { name: 'chromium', channel: 'msedge' };
    case 'chromium':
      return { name: 'chromium' };
    case 'firefox':
      return { name: 'firefox' };
    case 'webkit':
    case 'safari':
      return { name: 'webkit' };
    default:
      throw new Error(`Navegador no soportado: "${raw}". Usa chromium | chrome | firefox | webkit`);
  }
}

const browser = resolveBrowser(process.env.BROWSER);

export const env = {
  browser: browser.name,
  channel: browser.channel,
  headless: (process.env.HEADLESS ?? 'true') !== 'false',
  slowMo: Number(process.env.SLOW_MO ?? 0),
  baseUrl: process.env.BASE_URL ?? 'https://demowebshop.tricentis.com',
  apiBaseUrl: process.env.API_BASE_URL ?? 'https://webservice.toscacloud.com',
  defaultTimeout: Number(process.env.DEFAULT_TIMEOUT ?? 30_000),
} as const;
