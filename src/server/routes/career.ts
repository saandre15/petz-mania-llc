import { Router } from "express";
import * as CareerController from "../controller/career";

const route = Router();

route.post("/apply", CareerController.jobApply);

export default route;
