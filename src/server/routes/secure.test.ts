import fs from "fs";
import path from "path";

import request from "supertest";

import app from "../../server/index";

describe("Secure document access integration testing", () => {

  const demofilepath = path.join(__dirname, "secure", "demo.txt");
  
  before(done => {
    fs.writeFile(
      demofilepath,
      "This is a test document", {
        encoding: 'utf-8'
      },
      done
    )
  });
  
  after(done => {
    fs.unlink(demofilepath, done);
  })
  
  describe("GET /secure/demo.txt", () => {
    it("should return HTML", done => {
      request(app)
        .get("/secure/demo.txt")
        .send()
        .expect('Content-Type', /html/)
        .expect(200)
    });
  
  });
  
  describe("POST /secure/demo.txt", () => {
    it("should download demo.txt", () => {
      request(app)
        .post("/secure/demo.txt")
        .send({
          username: process.env["PETEXEC_USERNAME"],
          password: process.env["PETEXEC_PASSWORD"]
        })
        .expect(200)
        .expect('Content-Type', /plain/)
    });
  });
});

