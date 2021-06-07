declare namespace NodeJS {
  export interface ProcessEnv {
    NOREPLY_EMAIL_ADDRESS: string;
    NOREPLY_EMAIL_PASSWORD: string;
    NOREPLY_EMAIL_SMTP_ADDRESS: string;
    NOREPLY_EMAIL_SMTP_PORT: string;
    INFO_EMAIL_ADDRESS: string;
    INFO_EMAIL_PASSWORD: string;
    INFO_EMAIL_IMAP_ADDRESS: string;
    INFO_EMAIL_IMAP_PORT: string;

    PETEXEC_USERNAME: string;
    PETEXEC_PASSWORD: string;
    PETEXEC_CLIENTID: string;
    PETEXEC_CLIENTSECRET: string;
    PETEXEC_SCOPES: string;
  }
}