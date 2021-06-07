

declare module "guerrillamail-api" {
  import EventEmitter from "events";

  interface GuerillaConfig {
    emailUser: boolean | string;
    pollInterval: number
  }


  interface EmailAddressAPI {
    email_addr: string;
    email_timestamp: number;
    alias: string;
    alias_error: string;
    sid_token: String;
  }

  interface EmailAPI {
    att: number,
    mail_date: string;
    // Content
    mail_excerpt: string;
    mail_from: string;
    mail_id: number;
    mail_read: number;
    mail_subject: string;
    mail_timestamp: number;
  }

  export default class Guerilla extends EventEmitter {
    constructor(config: GuerillaConfig);
    pollStart(): void;
    pollStop(): void;
    pollPlay(): void;
    pollPause(): void;
    pollPause(): void;
    pollDestory(): void;
    setEmailUser(params: any): any;
    getEmailAddress(params?: any): Promise<EmailAddressAPI>;
    getOlderList(params: any): any;
    checkEmail(params: any): any;
    fetchEmail(emailId: string): any
    forgetMe(): void;
    delEmail(...emailIds: string[]): any;
    destory(): void;
  }
}