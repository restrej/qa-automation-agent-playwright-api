import type { Page } from 'playwright';
import { BasePage } from './BasePage';
import { HeaderComponent } from './components/HeaderComponent';

export class HomePage extends BasePage {
  readonly header: HeaderComponent;

  constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
  }

  async goto(): Promise<void> {
    await this.open('/');
  }
}
