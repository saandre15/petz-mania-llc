import { Request, Response } from "express";
import querystring from "querystring";
import { SendMailOptions } from "nodemailer";
import pug from "pug";

import { sendMailToHQ } from "./mail";


export function info(req: Request, res: Response) {
  const { name, email, findUs, reasons, message } = req.query;
  res.render("support.pug", {
    name, email, findUs, reasons, message
  });
  return;
}

function redirectToInfo(req: Request, res: Response, next: Function) {
  const { name, email, findUs, reasons, message } = res.locals;
  const query = querystring.stringify({
    name, email, findUs, reasons, message
  });
  res.redirect("/support/info?" + query);
  return next();
}

function setupSupportMail(req: Request, res: Response, next: Function) {
  const compilefn = pug.compileFile("emails/to-company.pug", {});
  
  const message: SendMailOptions = {
    subject: req.body.name + " has a concern or question.",
    html: compilefn({
      body: Object.keys(req.body)
        .map(key => `<p><strong>${key.toUpperCase()}:</strong> ${req.body[key]}</p>`)
        .reduce((prev, cur) => prev + cur)
    })
  };
  res.locals.message = message;
  return next();
}

export const submit = [
  setupSupportMail,
  ...sendMailToHQ,
  redirectToInfo
]


