import { NextFunction, Request, Response } from "express";
import Error from "../error/Error";

export default function (err: Error, req: Request, res: Response, next: NextFunction) {
    if(typeof err != "number") {
        res.render("error", { ERRORCODE: "500", ERRORMESSAGE: "Unable to determine the error that occured." });
        return;
    }
    // Read common error code to error message file
    res.render("error", {});
}