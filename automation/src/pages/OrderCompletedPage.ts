import type { Locator, Page } from 'playwright';
import { BasePage } from './BasePage';

export class OrderCompletedPage extends BasePage {
  readonly title: Locator;
  readonly orderNumber: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    super(page);
    const section = page.locator('.order-completed');
    this.title = section.locator('.title strong');
    this.orderNumber = section.locator('.details li').filter({ hasText: 'Order number' });
    this.continueButton = section.getByRole('button', { name: 'Continue' });
  }

  async message(): Promise<string> {
    return (await this.title.innerText()).trim();
  }

  async orderNumberValue(): Promise<string> {
    const text = await this.orderNumber.innerText();
    return text.replace(/order number:/i, '').trim();
  }
}
