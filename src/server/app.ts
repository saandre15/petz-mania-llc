import express, { Application } from "express";
import pug from "pug";
import path from "path";
import cookieParser from "cookie-parser";

import ErrorController from "./controller/error";
import Routes from "./routes/index";
import helmet from "helmet";

/**
 * Server App Configuration
 */
export function bootstrap(app: Application): Application {
  // Sets PugJS View Engine
  app.engine("pug", pug.renderFile);
  app.set("view engine", "pug");
  app.set("views",path.resolve(__dirname, "..", "src", "common", "view"));
  // Hardens HTTP headers security
  app.use(helmet);
  // Sets Cookie
  app.use(cookieParser());
  // Sets Form Encoding
  app.use(express.urlencoded({extended: false, limit: "10mb"}));
  // Sets up Public Directory
  app.use(express.static("public"));
  // Setups Error Handling
  app.use(ErrorController);
  // Setups Routing
  app.use(Routes);

  return app;
}