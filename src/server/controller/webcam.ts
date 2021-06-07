import { Request, Response } from "express";
import { FailedLoginAttemptException } from "../error/FailedLoginAttemptException";
import { signIn, verifySignIn } from "./sign-in";


export const access = [
  signIn,
  verifySignIn,
  (req: Request, res: Response, next: Function) => {
    try {
      if(res.locals["SUCCESSFUL_LOGIN"]) {
        res.render("webcam.pug");
      } else throw new FailedLoginAttemptException("Failed webcam login attempt with IP: " + req.ip);
    } catch(e) {
      res.render("webcam-login.pug", { 
        error: "Invalid username or password." 
        }
      );
    }
  }
]