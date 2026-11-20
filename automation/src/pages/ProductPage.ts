import type { Locator, Page } from 'playwright';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly productName: Locator;
  readonly quantity: Locator;
  readonly addToCartButton: Locator;
  readonly notificationBar: Locator;
  readonly closeNotification: Locator;

  constructor(page: Page) {
    super(page);
    const details = page.locator('.product-essential');
    this.productName = details.locator('.product-name h1');
    this.quantity = details.locator('input.qty-input');
    this.addToCartButton = details.getByRole('button', { name: 'Add to cart' });
    this.notificationBar = page.locator('#bar-notification');
    this.closeNotification = this.notificationBar.locator('.close');
  }

  async name(): Promise<string> {
    return (await this.productName.innerText()).trim();
  }

  async addToCart(quantity = 1): Promise<void> {
    await this.quantity.fill(String(quantity));
    await this.addToCartButton.click();
    await this.notificationBar.filter({ hasText: 'shopping cart' }).waitFor({ state: 'visible' });
  }

  async notificationText(): Promise<string> {
    return (await this.notificationBar.innerText()).trim();
  }
}
