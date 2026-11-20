import type { APIRequestContext } from 'playwright';
import type { Coffee } from '../models/Coffee';
import { ApiResponse, BaseApiClient } from './BaseApiClient';

/** Endpoints del recurso Coffees (Tosca Cloud CoffeeShop v1). */
export class CoffeeClient extends BaseApiClient {
  static readonly RESOURCE = '/api/v1/Coffees';
  private readonly deleted = new Set<number>();

  constructor(request: APIRequestContext) {
    super(request);
  }

  list(): Promise<ApiResponse<Coffee[]>> {
    return this.send(() => this.request.get(CoffeeClient.RESOURCE));
  }

  create(coffee: Coffee): Promise<ApiResponse<Coffee>> {
    return this.send(() => this.request.post(CoffeeClient.RESOURCE, { data: coffee }));
  }

  getById(id: number): Promise<ApiResponse<Coffee>> {
    return this.send(() => this.request.get(`${CoffeeClient.RESOURCE}/${id}`));
  }

  update(coffee: Coffee): Promise<ApiResponse<Coffee>> {
    return this.send(() => this.request.put(CoffeeClient.RESOURCE, { data: coffee }));
  }

  async delete(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.send(() => this.request.delete(CoffeeClient.RESOURCE, { params: { id } }));
    if (response.ok) this.deleted.add(id);
    return response;
  }

  wasDeleted(id: number): boolean {
    return this.deleted.has(id);
  }
}
