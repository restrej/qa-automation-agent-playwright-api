import type { Page } from 'playwright';
import { CartPage } from './CartPage';
import { CategoryPage } from './CategoryPage';
import { CheckoutPage } from './CheckoutPage';
import { HomePage } from './HomePage';
import { OrderCompletedPage } from './OrderCompletedPage';
import { ProductPage } from './ProductPage';
import { RegisterPage } from './RegisterPage';

/** Fábrica perezosa de Page Objects: una instancia por página y por escenario. */
export class PageManager {
  private cache = new Map<string, unknown>();

  constructor(private readonly page: Page) {}

  private get<T>(key: string, factory: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, factory());
    return this.cache.get(key) as T;
  }

  get home() { return this.get('home', () => new HomePage(this.page)); }
  get register() { return this.get('register', () => new RegisterPage(this.page)); }
  get category() { return this.get('category', () => new CategoryPage(this.page)); }
  get product() { return this.get('product', () => new ProductPage(this.page)); }
  get cart() { return this.get('cart', () => new CartPage(this.page)); }
  get checkout() { return this.get('checkout', () => new CheckoutPage(this.page)); }
  get orderCompleted() { return this.get('orderCompleted', () => new OrderCompletedPage(this.page)); }
}
