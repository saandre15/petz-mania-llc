import { EmailMessage } from "../../common/interface/Email";

import EmailTimeoutException from "../error/EmailTimeoutException";

export abstract class ImapClient {
  
  protected defaultTimeout: number;

  constructor() {
    this.defaultTimeout = 10 * 1000;
  }

  public abstract findMessagesBySubject(subject: string, since: Date): Promise<EmailMessage[]>;
  
  public async awaitMessagesBySubject(subject: string, since: Date, timeout: number): Promise<EmailMessage[]> {
    return new Promise((res, rej) => {
      setTimeout(() => rej(new EmailTimeoutException("The message was not sent in time.")), timeout);
    });
  }
}

export default ImapClient;