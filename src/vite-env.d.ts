/// <reference types="vite/client" />

interface OTPCredential extends Credential {
  code: string;
}

interface CredentialRequestOptions {
  otp?: {
    transport: ['sms'];
  };
}
