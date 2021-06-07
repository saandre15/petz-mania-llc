import { Request, Response } from "express";
import { SendMailOptions, createTransport, } from "nodemailer";
import process from "process";
import { MailLocals } from "../interface/mail";


const submissionAgent = createTransport({
  host: process.env["NOREPLY_EMAIL_SMTP_ADDRESS"],
  port: Number.parseInt(process.env["NOREPLY_EMAIL_SMTP_PORT"]),
  secure: true,
  auth: {
    user: process.env["NOREPLY_EMAIL_ADDRESS"],
    pass: process.env["NOREPLY_EMAIL_PASSWORD"]
  }
});

process

submissionAgent.verify((error, success) => {
  if(!error) return;
  console.error(error);
  throw new Error("Incorrect SMTP Configuration. Please make sure SMTP transport is configured properly before you restart the instance.");
})


export function setupMailToHQ(req: Request, res: Response<any, MailLocals>, next: Function): void {
  res.locals.message.to = ["info@petzmania.net"];
  next();
}

export function sendMail(req: Request, res: Response<any, MailLocals>, next: Function): void {
  const message: SendMailOptions = res.locals.message;
  if(!message.from || !message.to || !message.subject || !message.html) 
    throw new Error("An attempt to send an SMTP failed because the fields were incomplete.");
  if(!message.attachments) message.attachments = [];
  message.attachments.push({
    filename: 'logo.png',
    content: 'https://res.cloudinary.com/petzmania/image/upload/v1559360322/PetzManiaLogo.png',
    cid: 'logo.png'
  });
  submissionAgent.sendMail(message);
  return next();
}

export const sendMailToHQ = [
  setupMailToHQ,
  sendMail
]

export const sendTestMailToHQ = [
  (req: Request, res: Response, next: Function) => {
    res.locals.message["html"] = "The web server has just restarted. This is just a test email to ensure that the SMTP server works properly.";
    return next();
  },
  ...sendMailToHQ
]
