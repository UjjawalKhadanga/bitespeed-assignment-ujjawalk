// src/types.ts

export type IdentifyContactResponse = {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  },
  isCreatedNew: boolean;
};

export type ServiceSuccess<T> = {
  success: true;
  data: T;
};

export type ServiceError = {
  success: false;
  error: {
    code: number;
    message: string;
  };
};

export type ServiceResponse<T> = ServiceSuccess<T> | ServiceError;
