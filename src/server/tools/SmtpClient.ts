import { createTransport } from "nodemailer";
import Mail from "nodemailer/lib/mailer";

export class SmtpClient {
  
  constructor(username: string, password: string, address: string, port: number, tls: boolean) {
    createTransport({

    })
  }


  public sendEmail(to: string[], subject: string, body: string, attachments?: Mail.Attachment[]) {

  }

}

export default SmtpClient;