import type { Locator, Page } from 'playwright';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly cartRows: Locator;
  readonly termsOfService: Locator;
  readonly checkoutButton: Locator;
  readonly orderTotal: Locator;

  constructor(page: Page) {
    super(page);
    this.cartRows = page.locator('table.cart tr.cart-item-row');
    this.termsOfService = page.locator('#termsofservice');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
    this.orderTotal = page.locator('.cart-total .order-total');
  }

  async goto(): Promise<void> {
    await this.open('/cart');
  }

  rowFor(productName: string): Locator {
    return this.cartRows.filter({ has: this.page.locator('.product-name', { hasText: productName }) });
  }

  async productNames(): Promise<string[]> {
    return (await this.cartRows.locator('.product-name').allInnerTexts()).map((t) => t.trim());
  }

  /** El sitio exige aceptar los términos antes de habilitar el checkout. */
  async checkout(): Promise<void> {
    await this.termsOfService.check();
    await this.checkoutButton.click();
  }
}
