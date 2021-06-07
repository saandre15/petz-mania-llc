module.exports = {
  apps : [{
    name        : "petz-mania-llc-website",
    script      : "./dist/server.js",
    watch       : false,
    error_file  : "log/error.log",
    out_log     : "log/out.log",
    log_file    : "log/all.log",
    time        : true
  }]
}
