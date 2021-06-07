import { Application } from "express";
import request from "supertest";

import app from "../../server/index";

describe("GET /webcam/access", () => {
  it("should respond with HTML", done => {
    request(app)
      .post("/webcam/access")
      .send({
        username: process.env["PETEXEC_USERNAME"],
        password: process.env["PETEXEC_PASSWORD"]
      })
      .expect('Content-Type', /html/)
      .expect(200)
      .then(res => {
        done();
      })
      .catch(err => done(err));
  })
});



