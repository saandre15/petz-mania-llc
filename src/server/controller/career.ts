import { NextFunction, Request, Response } from "express";
import Formidable, { File } from "formidable";
import fs from "fs";
import pug from "pug";
import { SendMailOptions } from "nodemailer";
import path from "path";

import { sendMailToHQ } from "./mail";
import { uploadFile } from "./secure";
import { SecureLocals } from "../interface/secure";

export const handleResume = [
    async (req: Request, res: Response<any, SecureLocals>, next: Function) => {
        const form = new Formidable.IncomingForm({
            encoding: "utf-8",
            maxFileSize: 5 * 1024 * 1024 // 5 MB
        });
        
        form.parse(req, async (err, fields, files) => {
            
            if(err) throw new Error("Unable to handle resume form parsing.");
            const resume: File = files.resume as File;
            if(!resume) throw new Error("Resume was not uploaded properly.");
            const fileName = (fields.name as string).split(" ").join("_") + "_"  +fields.date;
            const fileMimeType = resume.type;

            fs.readFile(resume.path, (err, data) => {
                if(err) next(err.message);
                res.locals.files = [{
                    filename: fileName,
                    filecontent: data,
                    path: path.join(__dirname, "secure", "career", "resume"),
                }]
                next();
            })
        });
    },
    uploadFile,
    (req: Request, res: Response<any, SecureLocals>, next: NextFunction) => {
        const resumeUrl = req.hostname + res.locals.files[0].path;
        res.send({
            success: true,
            resumeUrl
        });
    }
]

export function setupEmail(req: Request, res: Response, next: Function) {

    if(!res.locals.fileURL)
        throw new Error("No file URL was set. Unable to send an email without the file URL to view.");

    const compileFn = pug.compileFile("emails/to-company.pug", {});

    const message: SendMailOptions = {
        subject: req.body.name + " has a job application.",
        html: compileFn({
            body: Object.keys(req.body)
                .filter(key => key != "resume")
                .map(key => `<p><strong>${key.toUpperCase()}:</strong> ${req.body[key]}</p>`)
                .reduce((prev, cur) => prev + cur)
                + `<p><strong>Resume URL:</strong><a href="${res.locals.fileURL}>">Click Here</a></p>`
        })
    }

    res.locals.message = message;
    
    return next();
}


export function redirectToSuccess(req: Request, res: Response): void {
    res.redirect("/html/job-success.html");
}

export const jobApply = [
    ...handleResume,
    setupEmail,
    ...sendMailToHQ,
    redirectToSuccess
]
