import imaps, { ImapSimple, Message } from "imap-simple";
import imap,  { FetchOptions } from "imap";
import  ImapClient  from "./ImapClient";
import { EmailMessage } from "../interface/mail";
import Mail from "nodemailer/lib/mailer";
import EmailTimeoutException from "../error/EmailTimeoutException";

export class StandardImapClient extends ImapClient {
  
  private config: imap.Config;
  
  constructor(username: string, password: string, host: string, port: number, tls: boolean) {
    super();
    this.config = {
      user: username,
      password: password,
      host: host,
      port: port,
      tls: tls,
      authTimeout: 3000
    };
  }

  private access(): Promise<ImapSimple> {
    return imaps.connect({
      imap: this.config
    })
  }


  public async awaitMessagesBySubject(subject: string, since: Date, timeout: number): Promise<EmailMessage[]> {
    return new Promise((res, rej) => {
      if(timeout <= 0) rej(new EmailTimeoutException(""));
    
      this.findMessagesBySubject(subject, since)
        .then(messages => {

        })

      if(messages.length == 0) return this.awaitMessagesBySubject(subject, since, timeout - 1000);
      else return messages;
    });
  }

  public async findMessagesBySubject(subject: string, since: Date): Promise<EmailMessage[]> {
    const connection = await this.access();
    const searchCriteria = ["HEADER", [ "SUBJECT", subject ], "UNSEEN", ["SINCE", since]];
    const fetchOptions: FetchOptions = {
      markSeen: false,
      bodies: ["HEADER", "TEXT"]
    }
    const messages = await connection.search(searchCriteria, fetchOptions);
    return Promise.all(messages.map(this.getMessage));
  }

  private async getMessage(message: imaps.Message): Promise<EmailMessage> {
    return {
      from: this.getFrom(message),
      to: this.getTo(message),
      subject: this.getSubject(message),
      body: this.getBody(message), // as HTML
      attachments: await this.getAttachments(message)
    }
  }

  private getFrom(message: imaps.Message): string {
    return message.parts 
      .filter(part => part.which === "HEADER")[0].body.from[0] as string;
  }

  private getTo(message: imaps.Message): string[] {
    return message.parts
      .filter(part => part.which === "HEADER")[0].body.to as string[];
  }

  private getSubject(message: imaps.Message): string {
    return message.parts
      .filter(part => part.which === "HEADER")[0].body.subject[0] as string;
  }

  private getBody(message: imaps.Message): string {
    const vals = message.parts
      .filter(part => part.which === "TEXT")[0]

    const html = Buffer.from(vals.body as string, 'base64').toString("ascii");
    return html;
  }

  private getAttachments(message: imaps.Message): Promise<Mail.Attachment[]> {
    return new Promise(async (res, rej) => {
      try {
        const parts = imaps.getParts(message.attributes.struct);
        const attachments = await Promise.all(parts
          .filter(part => part.disposition && part.disposition.type.toUpperCase() === "ATTACHMENT")
          .map(part => this.access()
            .then(connection => connection.getPartData(message, part))
              .then(data => {
                const attachment: Mail.Attachment = {

                }
                return attachment;
              }
            )
          ));
        res(attachments);
      } catch(e) {
        rej(e);
      }
    });
  }
}

export default ImapClient;