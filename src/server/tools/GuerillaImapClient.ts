import GuerillaAPI, { EmailAPI, GuerillaConfig } from "guerrillamail-api";
import ImapClient from "./StandardImapClient";

export class GuerillaImapClient implements ImapClient {


  private guerilla: GuerillaAPI;

  constructor(guerilla?: GuerillaConfig) {
    this.guerilla = new GuerillaAPI(guerilla);
    this.guerilla.pollStart();
  }

  public async getEmailAddress(): Promise<string> {
    const address = await this.guerilla.getEmailAddress();
    return address.email_addr;
  }

  public findMessagesBySubject(subject: string, since: Date) {

  }

  public async awaitMessagesBySubject(subject: string, since: Date, timeout: number) {
    return new Promise((res, rej) => {
      setTimeout(() => rej("Messages didn't arrive before timeout."), timeout);
      this.guerilla.on("newEmail", mails => {
        const emails = mails as EmailAPI[];
        
      })
    })
  }
}

export default GuerillaImapClient;