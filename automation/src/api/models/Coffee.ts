/** Modelo Coffee según el contrato OpenAPI de Tosca CoffeeShop (additionalProperties: false). */
export interface Coffee {
  id: number;
  name: string | null;
  description: string | null;
}

/** Builder de datos de prueba: nombres únicos para no chocar con otros usuarios del demo. */
export class CoffeeBuilder {
  private coffee: Coffee;

  private constructor() {
    const suffix = `${Date.now()}`.slice(-8);
    this.coffee = { id: 0, name: `QA Coffee ${suffix}`, description: `Café creado por automatización ${suffix}` };
  }

  static aCoffee(): CoffeeBuilder {
    return new CoffeeBuilder();
  }

  withId(id: number): this { this.coffee.id = id; return this; }
  withName(name: string): this { this.coffee.name = name; return this; }
  withDescription(description: string): this { this.coffee.description = description; return this; }

  build(): Coffee {
    return { ...this.coffee };
  }
}
