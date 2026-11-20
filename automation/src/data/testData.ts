import { randomUUID } from 'node:crypto';
import type { BillingAddress, CreditCard, Customer } from './types';

/** Genera un usuario único por ejecución para que el registro sea repetible. */
export function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  const unique = `${Date.now()}${randomUUID().slice(0, 4)}`;
  return {
    gender: 'male',
    firstName: 'Jose Elver',
    lastName: 'Arturo',
    email: `qa.auto.${unique}@mailinator.com`,
    password: `Qa#${unique.slice(-6)}`,
    ...overrides,
  };
}

/** Datos de entrega (los mismos del caso de negocio). */
export const defaultBillingAddress: BillingAddress = {
  company: 'Empresa Demo QA',
  country: 'Colombia',
  stateProvince: 'Other (Non US)',
  city: 'Medellín',
  address1: 'calle 14 # 6-51',
  address2: 'Carrera 17 # 3-56',
  zipPostalCode: '12315',
  phoneNumber: '3177777777',
  faxNumber: '15464',
};

/** Tarjeta de prueba suministrada por el negocio (no es real). */
export const visaTestCard: CreditCard = {
  type: 'Visa',
  holderName: 'Barbara Gordon',
  number: '4485564059489345',
  expireMonth: '04',
  expireYear: '2039',
  code: '123',
};

export const MESSAGES = {
  registrationCompleted: 'Your registration completed',
  addedToCart: 'The product has been added to your shopping cart',
  orderProcessed: 'Your order has been successfully processed!',
} as const;
