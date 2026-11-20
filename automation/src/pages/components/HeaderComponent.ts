import type { Locator, Page } from 'playwright';

/** Cabecera común a todas las páginas (componente reutilizable). */
export class HeaderComponent {
  readonly registerLink: Locator;
  readonly loginLink: Locator;
  readonly logoutLink: Locator;
  readonly accountLink: Locator;
  readonly shoppingCartLink: Locator;
  readonly cartQuantity: Locator;
  readonly topMenu: Locator;

  constructor(private readonly page: Page) {
    const headerLinks = page.locator('.header-links');
    this.registerLink = headerLinks.getByRole('link', { name: 'Register' });
    this.loginLink = headerLinks.getByRole('link', { name: 'Log in' });
    this.logoutLink = headerLinks.getByRole('link', { name: 'Log out' });
    this.accountLink = headerLinks.locator('a.account');
    this.shoppingCartLink = headerLinks.locator('a.ico-cart');
    this.cartQuantity = headerLinks.locator('.cart-qty');
    // :visible + first evita choques con el menú móvil oculto
    this.topMenu = page.locator('ul.top-menu:visible').first();
  }

  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async goToShoppingCart(): Promise<void> {
    await this.shoppingCartLink.click();
  }

  /** Abre una categoría del menú superior y, si se indica, su subcategoría. */
  async openCategory(category: string, subcategory?: string): Promise<void> {
    const categoryItem = this.topMenu.locator(':scope > li').filter({
      has: this.page.getByRole('link', { name: category, exact: true }),
    });
    if (subcategory) {
      // El submenú aparece al hacer hover sobre la categoría
      await categoryItem.getByRole('link', { name: category, exact: true }).hover();
      const subLink = categoryItem.locator('ul.sublist').getByRole('link', { name: subcategory, exact: true });
      if (await subLink.isVisible().catch(() => false)) {
        await subLink.click();
        return;
      }
      // Alternativa robusta: entrar a la categoría y elegir la subcategoría en la grilla
      await categoryItem.getByRole('link', { name: category, exact: true }).click();
      await this.page.locator('.sub-category-item').getByRole('link', { name: subcategory, exact: true }).first().click();
      return;
    }
    await categoryItem.getByRole('link', { name: category, exact: true }).click();
  }
}
