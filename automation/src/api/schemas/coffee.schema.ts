import Ajv, { type ValidateFunction } from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });

export const coffeeSchema = {
  $id: 'Coffee',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'description'],
  properties: {
    id: { type: 'integer', minimum: 1 },
    name: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
  },
} as const;

export const validateCoffee: ValidateFunction = ajv.compile(coffeeSchema);

/** Devuelve los errores del esquema en texto legible (vacío si es válido). */
export function schemaErrors(validate: ValidateFunction, data: unknown): string {
  return validate(data) ? '' : ajv.errorsText(validate.errors, { separator: '\n' });
}
