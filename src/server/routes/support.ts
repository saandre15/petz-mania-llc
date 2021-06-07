import { Request, Response, Router } from "express";
import * as SupportController from "../controller/support";

const route = Router();

route.get("/info", SupportController.info);
route.post("/submit", SupportController.submit);

export default route;

