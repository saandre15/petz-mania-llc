import { Application } from "express";
import request from "supertest";
import app from "../../server/index";

describe("GET /pricing", () => {
  it("should return HTML page", done => {
    request(app)
      .get("/pricing")
      .send()
      .expect(200)
      .expect('Content-Type', /html/)
      .then(done)
      .catch(e => done(e))
  })
})
