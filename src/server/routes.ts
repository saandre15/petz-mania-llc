import { Router } from "express";
import SupportRoute from "./routes/support";
import CareerRoute from "./routes/career";
import PricingRoute from "./routes/pricing";
import WebcamRoute from "./routes/webcam";
import SecureRoute from "./routes/secure";

const route = Router();

route.use("/career", CareerRoute);
route.use("/pricing", PricingRoute);
route.use("/support", SupportRoute);
route.use("/webcam", WebcamRoute);
route.use("/secure", SecureRoute);

export default route;
