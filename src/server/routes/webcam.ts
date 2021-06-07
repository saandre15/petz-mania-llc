import { Router } from "express";
import { access } from "../controller/webcam";

const route = Router();

route.get("/access", (req, res, next) => res.redirect("back"));
route.post("/access", access);

export default route;
