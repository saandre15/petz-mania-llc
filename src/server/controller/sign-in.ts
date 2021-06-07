
import { Request, Response, NextFunction } from "express";
import cron from "node-cron";

import { PetexecToken } from "../model/PetexecToken";

export async function signIn(req: Request, res: Response, next: NextFunction) {
  try {
    const token = new PetexecToken(
      process.env["PETEXEC_CLIENTID"],
      process.env["PETEXEC_CLIENTSECRET"],
      req.body.username,
      req.body.password,
      process.env["PETEXEC_SCOPES"],
      false
    );
    await token.build();

    res.locals["AUTH_TOKEN"] = token;
    return next();
  
  }
  catch(e) {
    console.error(e);
    console.log(req.body);
    next(500);
  }
}


export function verifySignIn(req: Request, res: Response, next: Function) {
  const token = res.locals["AUTH_TOKEN"];

  if((token as PetexecToken).isAuth()) res.locals["SUCCESSFUL_LOGIN"] = true;
  return next();
}
