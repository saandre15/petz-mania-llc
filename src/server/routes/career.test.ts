import { Application } from "express";
import request from "supertest";
import Guerrilla from "guerrillamail-api";
import fs from "fs";
import path from "path";
import { expect } from "chai";

import app from "../../server/index";
import checksum from "../../common/helper/checksum";
import  StandardImapClient  from "../tools/StandardImapClient";

describe("GET /career/apply", async () => {

  const resumefn = "resume-samples.pdf";
  const resumepath = path.join(__dirname, "public", "assets", "pdf", resumefn);
  const start = new Date();

  const guerrilla = new Guerrilla({
    emailUser: false,
    pollInterval: 2000,
  });
  
  const email_address = (await guerrilla.getEmailAddress()).email_addr;
  const fullname = "John Doe";
  
  it("should return HTML page", done => {
    
    const formData = new FormData();
    // Basic Information
    formData.append("name", fullname);
    formData.append("date", "2021-04-21");
    formData.append("position", "Kennel Tech / Attendant");
    formData.append("start_date", "2021-04-23");
    formData.append("phone_number", "999-999-9999");
    formData.append("SSN", "999-99-9999");
    formData.append("email_address", email_address);
    formData.append("address", "1234 Temple Drive");
    formData.append("city", "Dallas");
    formData.append("state", "TX");
    formData.append("zip_code", "99999");
    formData.append("prev_family_members", "Jane Doe");
    formData.append("learn_opportunities", "Online");
    formData.append("applied_before", "yes");
    formData.append("legally_allowed_to_work", "yes");
    formData.append("convicted_felony", "no");
    formData.append("abled_body", "yes");
    formData.append("presently_employed", "yes");
    formData.append("can_contact_employer", "no");
    // Education
    formData.append("highest_education", "High School");
    formData.append("education_completed_year", "01-02-2020");
    formData.append("is_graduated", "no");
    formData.append("education_course", "Marketing");
    // Recent Work Experience
    formData.append("first_job", "no");
    formData.append("most_recent_company", "PetSmart");
    formData.append("most_recent_start_date", "01-02-2020");
    formData.append("most_recent_end_date", "01-02-2021");
    formData.append("most_recent_company_address", "2451 Lenar Drive");
    formData.append("most_recent_company_phone_num", "111-111-1111");
    formData.append("most_recent_postion", "Store Clerk");
    formData.append("most_recent_supervisor_name", "John");
    formData.append("most_recent_shift_type", "Full Time");
    formData.append("most_recent_starting_pay", "$12");
    formData.append("most_recent_ending_pay", "$14");
    formData.append("most_recent_duties", "-Checking out customers");
    formData.append("most_recent_reason_for_leaving", "N/A");
    fs.readFile(resumepath, (err, data) => {
      formData.append("resume", new File([data], ""));
      request(app)
        .post("/career/apply")
        .send(formData)
        .then(done)
        .catch(done);
    })
  });

  it("should have a resume in the secure folder",  done => {
    const timeout = 5 * 1000;
    setTimeout(() => done("The resume did not end up in the secure folder"), timeout);
    fs.watch(path.join(__dirname, "secure", "resume"), (event, filename) => {
      if(filename == resumefn) done();
    });
  })

  it("should email the company about potential candidate information.", async done => {
    const imap: ImapClient = ImapClient.default;
    const messages = await imap.awaitMessageBySubject(fullname + " has a job application", start, 10000);
    if(messages.length > 0) done();
    else done("The server has not sent an email to this address");
  });

  it("should email a thank you notice to the potential employee.", async done => {
    
  });

  describe("POST /secure/career/resume", () => {
    it("should return the same resume", done => {
      request(app)
        .post("/secure/career/resume/" + resumefn)
        .send({
          username: process.env["PETEXEC_USERNAME"],
          password: process.env["PETEXEC_PASSWORD"]
        })
        .expect('Content-Type', /pdf/)
        .expect(200)
        .buffer()
        .parse((res, cb) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', chunk => data+= chunk);
          res.on('end', () => cb(null, data))
        })
        .then(val => {
          fs.readFile(resumepath, (err, data) => {
            if(err) done(err);
            expect(checksum(val.body, 'binary')).to.equal(checksum(data.toString("binary"), 'binary'))
          })
          
        })
        .catch(err => done(err))
      });
    })
});