import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { FailedLoginAttemptException } from "../error/FailedLoginAttemptException";
import { InvalidAccountTypeException } from "../error/InvalidAccountTypeException";
import { SecureLocals } from "../interface/secure";
import PetexecAccount from "../model/PetexecAccount";
import PetexecToken from "../model/PetexecToken";
import { signIn, verifySignIn } from "./sign-in";

export function getAuthForm(req: Request, res: Response, next: NextFunction) {
  res.render("secure-login.pug", {
    securePath: req.path
  });
}

const auth = [
  signIn,
  verifySignIn,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.locals["SUCCESSFUL_LOGIN"]
      const token: PetexecToken = res.locals["AUTH_TOKEN"];
      const account: PetexecAccount = new PetexecAccount(token);
      await account.build();
      if(account.isEmployee()) next();
      else throw new InvalidAccountTypeException("Cannot authenticate w/o an Employee Account");
    } catch(e) {
      if(e instanceof InvalidAccountTypeException) {
        res.render("secure-login.pug", {
          securePath: req.path,
          error: "Invalid login account type. Please make sure the account is an employee account."
        })
      }
      if(e instanceof FailedLoginAttemptException) {
        res.render("secure-login.pug", {
          securePath: req.path,
          error: "The login credientals are incorrect."
        });
      }
    }
  }
] 

function getContent(req: Request, res: Response, next: NextFunction) {
  res.download(req.path);
}

export const access = [
  ...auth,
  getContent
]

export function uploadFile(req:Request, res: Response<any, SecureLocals>, next: NextFunction) {
  
}