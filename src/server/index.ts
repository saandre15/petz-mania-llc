import https from "https";;
import http from "http";
import fs from "fs";
import express from "express";

import { bootstrap } from "./app";


const app = bootstrap(express());

if(process.env.NODE_ENV == "production") {
  const options: https.ServerOptions = {
    key: fs.readFileSync(`${process.env.PWD}/ssl/key.pem`, "utf-8"),
    cert: fs.readFileSync(`${process.env.PWD}/ssl/cert.pem`, "utf-8")
  };
  
  const httpServer = http
    .createServer((req, res) => {
      console.log(req);
      const url = req.url ? req.url : "/";
      const baseDomain = req.headers.host;
      res.writeHead(302, { Location: `https://${baseDomain}${url}` });
      res.end();
    })
  
  
  
  const httpsServer = https
    .createServer(options, app)
    .listen(443, () =>
      console.log(
        new Date() +
          " WEB SERVER LOOKING FOR REQUEST at " +
          httpsServer.address().toString()
      )
    );  
}

else if (process.env.NODE_ENV == "development") {
  const httpServer = http
    .createServer(app)
    .listen(8080, () =>
      console.log(
        new Date() +
          " WEB SERVER LOOKING FOR REQUEST at " +
          httpServer.address().toString()
      )
    );
}

export default app;