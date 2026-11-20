import type { Locator, Page } from 'playwright';
import type { Customer } from '../data/types';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  readonly genderMale: Locator;
  readonly genderFemale: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly registerButton: Locator;
  readonly result: Locator;
  readonly continueButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    // Los labels son únicos en esta página -> getByLabel es el localizador más legible
    this.genderMale = page.getByLabel('Male', { exact: true });
    this.genderFemale = page.getByLabel('Female', { exact: true });
    this.firstName = page.getByLabel('First name:');
    this.lastName = page.getByLabel('Last name:');
    this.email = page.getByLabel('Email:');
    this.password = page.getByLabel('Password:', { exact: true });
    this.confirmPassword = page.getByLabel('Confirm password:');
    this.registerButton = page.getByRole('button', { name: 'Register' });
    this.result = page.locator('.page.registration-result-page .result');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.fieldErrors = page.locator('.field-validation-error');
  }

  async goto(): Promise<void> {
    await this.open('/register');
  }

  async fillForm(customer: Customer): Promise<void> {
    await (customer.gender === 'female' ? this.genderFemale : this.genderMale).check();
    await this.type(this.firstName, customer.firstName);
    await this.type(this.lastName, customer.lastName);
    await this.type(this.email, customer.email);
    await this.type(this.password, customer.password);
    await this.type(this.confirmPassword, customer.password);
  }

  async submit(): Promise<void> {
    await this.registerButton.click();
  }

  async register(customer: Customer): Promise<void> {
    await this.fillForm(customer);
    await this.submit();
  }

  async resultMessage(): Promise<string> {
    return (await this.result.innerText()).trim();
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
