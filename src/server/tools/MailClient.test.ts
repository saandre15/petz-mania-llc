import  GuerillaImapClient  from "./GuerillaImapClient";
import SmtpClient from "./SmtpClient"
import { StandardImapClient } from "./StandardImapClient";

describe("MailClient", () => {

  let smtpClient: SmtpClient;
  let guerillaImapClient: GuerillaImapClient;
  let standardImapClient: StandardImapClient;

  before(done => {
    smtpClient = new SmtpClient(
      process.env["NOREPLY_EMAIL_ADDRESS"],
      process.env["NOREPLY_EMAIL_PASSWORD"],
      process.env["NOREPLY_EMAIL_SMTP_ADDRESS"],
      Number.parseInt("NOREPLY_EMAIL_SMTP_PORT"),
      true
    );
    guerillaImapClient = new GuerillaImapClient();
    standardImapClient = new StandardImapClient(
      process.env["INFO_EMAIL_ADDRESS"],
      process.env["INFO_EMAIL_PASSWORD"],
      process.env["INFO_EMAIL_IMAP_ADDRESS"],
      Number.parseInt(process.env["INFO_EMAIL_IMAP_PORT"]),
      true
    );
    done();
  });


  it("should send an email to HQ email address", () => {
    const uuid = Math.ceil(Math.random() * 100000);
    smtpClient.sendEmail(
      [process.env["INFO_EMAIL_ADDRESS"]],
      "Test email - " + uuid,
      "This is a test email for the website. Please ignore this."
    );
    
    
  });

  it("should send an email to random email address", () => {

  });
  

})