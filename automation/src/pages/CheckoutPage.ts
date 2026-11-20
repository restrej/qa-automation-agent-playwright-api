import type { Locator, Page } from 'playwright';
import type { BillingAddress, CreditCard } from '../data/types';
import { BasePage } from './BasePage';

/**
 * One Page Checkout de demowebshop (6 pasos acordeón).
 * Cada botón "Continue" se acota a su contenedor para que el localizador sea único.
 */
export class CheckoutPage extends BasePage {
  // Paso 1 - Billing address
  readonly billingAddressSelect: Locator;
  readonly billingFirstName: Locator;
  readonly billingLastName: Locator;
  readonly billingEmail: Locator;
  readonly billingCompany: Locator;
  readonly billingCountry: Locator;
  readonly billingState: Locator;
  readonly billingCity: Locator;
  readonly billingAddress1: Locator;
  readonly billingAddress2: Locator;
  readonly billingZip: Locator;
  readonly billingPhone: Locator;
  readonly billingFax: Locator;
  readonly billingContinue: Locator;
  // Paso 2/3 - Shipping
  readonly shippingContinue: Locator;
  readonly shippingMethodContinue: Locator;
  // Paso 4 - Payment method
  readonly paymentMethodSection: Locator;
  readonly paymentMethodContinue: Locator;
  // Paso 5 - Payment information
  readonly creditCardType: Locator;
  readonly cardholderName: Locator;
  readonly cardNumber: Locator;
  readonly expireMonth: Locator;
  readonly expireYear: Locator;
  readonly cardCode: Locator;
  readonly paymentInfoContinue: Locator;
  // Paso 6 - Confirm
  readonly confirmButton: Locator;

  constructor(page: Page) {
    super(page);
    const billing = page.locator('#opc-billing');
    this.billingAddressSelect = billing.locator('#billing-address-select');
    this.billingFirstName = billing.locator('#BillingNewAddress_FirstName');
    this.billingLastName = billing.locator('#BillingNewAddress_LastName');
    this.billingEmail = billing.locator('#BillingNewAddress_Email');
    this.billingCompany = billing.locator('#BillingNewAddress_Company');
    this.billingCountry = billing.locator('#BillingNewAddress_CountryId');
    this.billingState = billing.locator('#BillingNewAddress_StateProvinceId');
    this.billingCity = billing.locator('#BillingNewAddress_City');
    this.billingAddress1 = billing.locator('#BillingNewAddress_Address1');
    this.billingAddress2 = billing.locator('#BillingNewAddress_Address2');
    this.billingZip = billing.locator('#BillingNewAddress_ZipPostalCode');
    this.billingPhone = billing.locator('#BillingNewAddress_PhoneNumber');
    this.billingFax = billing.locator('#BillingNewAddress_FaxNumber');
    this.billingContinue = page.locator('#billing-buttons-container').getByRole('button', { name: 'Continue' });

    this.shippingContinue = page.locator('#shipping-buttons-container').getByRole('button', { name: 'Continue' });
    this.shippingMethodContinue = page
      .locator('#shipping-method-buttons-container')
      .getByRole('button', { name: 'Continue' });

    this.paymentMethodSection = page.locator('#checkout-step-payment-method');
    this.paymentMethodContinue = page
      .locator('#payment-method-buttons-container')
      .getByRole('button', { name: 'Continue' });

    const paymentInfo = page.locator('#checkout-step-payment-info');
    this.creditCardType = paymentInfo.locator('#CreditCardType');
    this.cardholderName = paymentInfo.locator('#CardholderName');
    this.cardNumber = paymentInfo.locator('#CardNumber');
    this.expireMonth = paymentInfo.locator('#ExpireMonth');
    this.expireYear = paymentInfo.locator('#ExpireYear');
    this.cardCode = paymentInfo.locator('#CardCode');
    this.paymentInfoContinue = page.locator('#payment-info-buttons-container').getByRole('button', { name: 'Continue' });

    this.confirmButton = page.locator('#confirm-order-buttons-container').getByRole('button', { name: 'Confirm' });
  }

  async fillBillingAddress(address: BillingAddress): Promise<void> {
    await this.billingContinue.waitFor({ state: 'visible' });
    // Si el usuario ya tiene direcciones aparece el combo: elegimos "New Address"
    if (await this.billingAddressSelect.isVisible().catch(() => false)) {
      await this.billingAddressSelect.selectOption({ label: 'New Address' });
    }
    // Nombre / apellido / email vienen precargados desde la cuenta: solo se sobreescriben si se envían
    await this.type(this.billingFirstName, address.firstName);
    await this.type(this.billingLastName, address.lastName);
    await this.type(this.billingEmail, address.email);
    await this.type(this.billingCompany, address.company);
    await this.billingCountry.selectOption({ label: address.country });
    await this.waitForAjax();
    if (address.stateProvince) {
      // El combo de estados se recarga por AJAX al cambiar de país
      await this.billingState.locator('option', { hasText: address.stateProvince }).waitFor({ state: 'attached' });
      await this.billingState.selectOption({ label: address.stateProvince });
    }
    await this.type(this.billingCity, address.city);
    await this.type(this.billingAddress1, address.address1);
    await this.type(this.billingAddress2, address.address2);
    await this.type(this.billingZip, address.zipPostalCode);
    await this.type(this.billingPhone, address.phoneNumber);
    await this.type(this.billingFax, address.faxNumber);
  }

  async continueFromBilling(): Promise<void> {
    await this.billingContinue.click();
    await this.waitForAjax();
  }

  /** Dirección de envío: se deja la que carga por defecto (misma de facturación). */
  async continueWithDefaultShippingAddress(): Promise<void> {
    // Algunas configuraciones saltan este paso cuando "Ship to the same address" está marcado
    const visible = await this.shippingContinue
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (visible) {
      await this.shippingContinue.click();
      await this.waitForAjax();
    }
  }

  /** Método de envío: se deja el que viene seleccionado por defecto. */
  async continueWithDefaultShippingMethod(): Promise<void> {
    await this.shippingMethodContinue.click();
    await this.waitForAjax();
  }

  async selectPaymentMethod(method: string): Promise<void> {
    await this.paymentMethodSection.getByLabel(method, { exact: false }).check();
    await this.paymentMethodContinue.click();
    await this.waitForAjax();
  }

  async fillCreditCard(card: CreditCard): Promise<void> {
    await this.creditCardType.waitFor({ state: 'visible' });
    await this.creditCardType.selectOption({ label: card.type });
    await this.cardholderName.fill(card.holderName);
    await this.cardNumber.fill(card.number);
    await this.expireMonth.selectOption({ label: card.expireMonth });
    await this.expireYear.selectOption({ label: card.expireYear });
    await this.cardCode.fill(card.code);
  }

  async continueFromPaymentInfo(): Promise<void> {
    await this.paymentInfoContinue.click();
    await this.waitForAjax();
  }

  async confirmOrder(): Promise<void> {
    await this.confirmButton.click();
    await this.page.waitForURL(/\/checkout\/completed/);
  }
}
