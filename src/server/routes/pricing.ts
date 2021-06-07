import { Request, Response, Router } from "express";
import { info } from "../controller/pricing";

const route = Router();

route.use(info);

export default route;