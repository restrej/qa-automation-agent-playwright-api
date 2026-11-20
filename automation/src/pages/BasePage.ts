import type { Locator, Page } from 'playwright';

/**
 * Clase base del patrón Page Object Model.
 *
 * Estrategia de localización (de más a menos preferida):
 *  1. Roles accesibles y labels únicos  -> page.getByRole / page.getByLabel
 *  2. data-testid                        -> page.getByTestId
 *  3. IDs estables generados por el backend (nopCommerce usa ids semánticos: #FirstName)
 *  4. Clases semánticas acotadas a un contenedor (#billing-buttons-container .new-address-next-step-button)
 *  Nunca: XPath absolutos, índices posicionales (nth) sin contenedor, ni textos cambiantes.
 */
export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  async open(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /** Espera a que terminen los indicadores AJAX "please wait" del one-page checkout. */
  protected async waitForAjax(): Promise<void> {
    const loaders = this.page.locator('.please-wait:visible, .ajax-loading-block-window:visible');
    await loaders.first().waitFor({ state: 'hidden' }).catch(() => undefined);
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
  }

  /** Limpia y escribe (fill ya hace clear, pero dejamos el contrato explícito). */
  protected async type(locator: Locator, value: string | undefined): Promise<void> {
    if (value === undefined) return;
    await locator.fill(value);
  }

  protected async selectByLabel(locator: Locator, label: string | undefined): Promise<void> {
    if (label === undefined) return;
    await locator.selectOption({ label });
  }

  get url(): string {
    return this.page.url();
  }
}
