import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import type { APIRequestContext, BrowserContext, Page } from 'playwright';
import { CoffeeClient } from '../api/clients/CoffeeClient';
import type { ApiResponse } from '../api/clients/BaseApiClient';
import type { Coffee } from '../api/models/Coffee';
import type { Customer } from '../data/types';
import { PageManager } from '../pages/PageManager';

/**
 * Estado compartido por los pasos de un escenario (un World por escenario).
 * Así evitamos variables globales y los escenarios quedan aislados.
 */
export class CustomWorld extends World {
  context?: BrowserContext;
  page?: Page;
  private pageManager?: PageManager;

  request?: APIRequestContext;
  coffeeClient?: CoffeeClient;

  /** Datos de contexto del escenario (UI) */
  customer?: Customer;
  selectedProduct?: string;
  orderNumber?: string;

  /** Datos de contexto del escenario (API) */
  lastResponse?: ApiResponse<unknown>;
  createdCoffee?: Coffee;
  coffeePayload?: Coffee;
  updatedPayload?: Coffee;
  /** Estado de los recursos CRUD generados por el agente (src/api/generated) */
  apiState: Record<string, unknown> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }

  get pages(): PageManager {
    if (!this.page) throw new Error('No hay página activa: ¿el escenario tiene el tag @ui?');
    this.pageManager ??= new PageManager(this.page);
    return this.pageManager;
  }

  get coffees(): CoffeeClient {
    if (!this.coffeeClient) throw new Error('No hay cliente API: ¿el escenario tiene el tag @api?');
    return this.coffeeClient;
  }
}

setWorldConstructor(CustomWorld);
