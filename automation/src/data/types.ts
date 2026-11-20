export interface Customer {
  gender: 'male' | 'female';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface BillingAddress {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  country: string;
  stateProvince?: string;
  city: string;
  address1: string;
  address2?: string;
  zipPostalCode: string;
  phoneNumber: string;
  faxNumber?: string;
}

export interface CreditCard {
  type: string;
  holderName: string;
  number: string;
  expireMonth: string;
  expireYear: string;
  code: string;
}
