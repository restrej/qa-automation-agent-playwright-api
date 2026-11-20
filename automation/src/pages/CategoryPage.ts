import type { Locator, Page } from 'playwright';
import { BasePage } from './BasePage';

/** Listado de productos de una categoría / subcategoría. */
export class CategoryPage extends BasePage {
  readonly title: Locator;
  readonly productItems: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('.page.category-page .page-title h1');
    this.productItems = page.locator('.product-grid .product-item');
  }

  async heading(): Promise<string> {
    return (await this.title.innerText()).trim();
  }

  productByName(name: string): Locator {
    return this.productItems.filter({ has: this.page.locator('.product-title').getByRole('link', { name, exact: true }) });
  }

  async openProduct(name: string): Promise<void> {
    await this.productByName(name).locator('.product-title').getByRole('link', { name, exact: true }).click();
  }
}
