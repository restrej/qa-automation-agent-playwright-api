import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { buildCustomer } from '../../data/testData';
import { CustomWorld } from '../../support/world';

Given('que el usuario se encuentra en la página de inicio de Demo Web Shop', async function (this: CustomWorld) {
  await this.pages.home.goto();
  await expect(this.page!).toHaveTitle(/Demo Web Shop/);
});

Given('que el usuario se encuentra en la página de registro', async function (this: CustomWorld) {
  await this.pages.register.goto();
  await expect(this.pages.register.registerButton).toBeVisible();
});

When('se registra con datos válidos y un correo único', async function (this: CustomWorld) {
  this.customer = buildCustomer();
  await this.pages.home.header.goToRegister();
  await this.pages.register.register(this.customer);
  this.attach(`Usuario registrado: ${this.customer.email}`, 'text/plain');
});

When('envía el formulario de registro sin diligenciar datos', async function (this: CustomWorld) {
  await this.pages.register.submit();
});

Then('debe ver el mensaje de registro {string}', async function (this: CustomWorld, expected: string) {
  // Validación 1: registro exitoso
  await expect(this.pages.register.result).toHaveText(expected);
  await expect(this.page!).toHaveURL(/registerresult/i);
});

Then('debe quedar autenticado con su correo en la cabecera', async function (this: CustomWorld) {
  await expect(this.pages.home.header.accountLink).toHaveText(this.customer!.email);
  await expect(this.pages.home.header.logoutLink).toBeVisible();
});

Then('debe ver el mensaje de validación {string}', async function (this: CustomWorld, message: string) {
  await expect(this.pages.register.fieldErrors.filter({ hasText: message }).first()).toBeVisible();
});
