import { Router } from "express";
import { access, getAuthForm } from "../controller/secure";

const route = Router();

route.get("/secure/**/*", getAuthForm);
route.post("/secure/**/*", access);

export default route;