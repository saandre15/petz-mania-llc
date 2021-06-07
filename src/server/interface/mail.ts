import Mail from "nodemailer/lib/mailer";

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  /**
   * HTML OR TXT
   */
  body: string;
  attachments: Mail.Attachment[];
}

export interface MailLocals {
  message?: EmailMessage;
}
