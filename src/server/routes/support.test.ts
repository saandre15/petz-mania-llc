import { Application } from "express";
import request from "supertest";
import GuerillaApi, { EmailAPI } from "guerrillamail-api";

import app from "../../server/index";
import StandardImapClient from "../tools/StandardImapClient";


describe("GET /support/submit", async () => {

  const start: Date = new Date();
  
  const guerilla = new GuerillaApi({
    emailUser: false,
    pollInterval: 2000
  });
  guerilla.pollStart();
  const email = await guerilla.getEmailAddress();
  const email_address = email.email_addr;
  
  const fullname: string  = "John Doe";

  it("should respond with HTML", done => {
    request(app)
    .post("/support/submit")
    .send({
      name: fullname,
      email: email_address,
      findUs: "Friends",
      reason: "Dog Boarding",
      message: "This is just a test message to ensure that the support submission is working."
    })
    .expect(200)
    .then(val => done())
    .catch(error => done(error));
  });
  it("should email potential customer about support confirmation", async done => {
    
  });
  it("should email company about the support inquery", async done => {
    const imap =  ImapClient.default;
    const messages = await imap.awaitMessagesBySubject(fullname + " has a concern or question.", start, 10 * 1000);
    if(messages.length > 0) done();
    done("Email server didn't receive support inquery email");
  });
});


