import type { APIRequestContext, APIResponse } from 'playwright';

export interface ApiResponse<T> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: T;
  rawText: string;
  durationMs: number;
}

/**
 * Cliente HTTP base: centraliza serialización, medición de tiempos y parseo seguro.
 * Los clientes de cada recurso solo declaran endpoints.
 */
export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected async send<T>(call: () => Promise<APIResponse>): Promise<ApiResponse<T>> {
    const started = Date.now();
    const response = await call();
    const durationMs = Date.now() - started;
    const rawText = await response.text();
    let body: unknown = rawText;
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = rawText;
      }
    } else {
      body = null;
    }
    return {
      status: response.status(),
      ok: response.ok(),
      headers: response.headers(),
      body: body as T,
      rawText,
      durationMs,
    };
  }
}
