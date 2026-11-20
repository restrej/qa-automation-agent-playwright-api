import { DataTable, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { defaultBillingAddress, MESSAGES } from '../../data/testData';
import type { BillingAddress, CreditCard } from '../../data/types';
import { CustomWorld } from '../../support/world';
import { normalizedHash } from '../../utils/table';

When(
  'navega a la categoría {string} y subcategoría {string}',
  async function (this: CustomWorld, category: string, subcategory: string) {
    await this.pages.home.header.openCategory(category, subcategory.trim() || undefined);
    await expect(this.pages.category.title).toHaveText(subcategory.trim() || category);
  },
);

When('agrega el producto {string} al carrito', async function (this: CustomWorld, productName: string) {
  this.selectedProduct = productName;
  await this.pages.category.openProduct(productName);
  await expect(this.pages.product.productName).toHaveText(productName);
  await this.pages.product.addToCart(1);
  await expect(this.pages.product.notificationBar).toContainText(MESSAGES.addedToCart);
  await expect(this.pages.home.header.cartQuantity).toHaveText('(1)');
});

When('ingresa al carrito y da clic en Checkout', async function (this: CustomWorld) {
  await this.pages.home.header.goToShoppingCart();
  await expect(this.pages.cart.rowFor(this.selectedProduct!)).toHaveCount(1);
  await this.pages.cart.checkout();
  await expect(this.page!).toHaveURL(/onepagecheckout/i);
});

When('diligencia la dirección de facturación con los datos:', async function (this: CustomWorld, table: DataTable) {
  const d = normalizedHash(table.rowsHash());
  const address: BillingAddress = {
    ...defaultBillingAddress,
    company: d.company ?? defaultBillingAddress.company,
    country: d.country ?? defaultBillingAddress.country,
    stateProvince: d.stateprovince ?? defaultBillingAddress.stateProvince,
    city: d.city ?? defaultBillingAddress.city,
    address1: d.address1 ?? defaultBillingAddress.address1,
    address2: d.address2 ?? defaultBillingAddress.address2,
    zipPostalCode: d.zippostalcode ?? defaultBillingAddress.zipPostalCode,
    phoneNumber: d.phonenumber ?? defaultBillingAddress.phoneNumber,
    faxNumber: d.faxnumber ?? defaultBillingAddress.faxNumber,
  };
  const checkout = this.pages.checkout;
  await checkout.fillBillingAddress(address);
  // Nombre, apellido y correo se dejan como los precarga el sitio desde la cuenta
  await expect(checkout.billingEmail).toHaveValue(this.customer!.email);
  await checkout.continueFromBilling();
});

When('deja por defecto la dirección y el método de envío', async function (this: CustomWorld) {
  await this.pages.checkout.continueWithDefaultShippingAddress();
  await this.pages.checkout.continueWithDefaultShippingMethod();
});

When('selecciona {string} como método de pago', async function (this: CustomWorld, method: string) {
  await this.pages.checkout.selectPaymentMethod(method);
});

When('completa la información de pago con los datos:', async function (this: CustomWorld, table: DataTable) {
  const d = normalizedHash(table.rowsHash());
  const [month, year] = d.expirationdate.split('/');
  const card: CreditCard = {
    type: d.selectcreditcard,
    holderName: d.cardholdername,
    number: d.cardnumber,
    expireMonth: month.padStart(2, '0'),
    expireYear: year,
    code: d.cardcode,
  };
  await this.pages.checkout.fillCreditCard(card);
  await expect(this.pages.checkout.cardNumber).toHaveValue(card.number);
  await this.pages.checkout.continueFromPaymentInfo();
});

When('confirma la orden', async function (this: CustomWorld) {
  await this.pages.checkout.confirmOrder();
});

Then('debe ver el mensaje {string}', async function (this: CustomWorld, expected: string) {
  // Validación 2: finalización exitosa de la compra
  await expect(this.pages.orderCompleted.title).toHaveText(expected);
});

Then('debe generarse un número de orden', async function (this: CustomWorld) {
  this.orderNumber = await this.pages.orderCompleted.orderNumberValue();
  expect(this.orderNumber).toMatch(/^\d+$/);
  this.attach(`Número de orden: ${this.orderNumber}`, 'text/plain');
});
