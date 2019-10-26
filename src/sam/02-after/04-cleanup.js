let fs = require('fs')
let path = require('path')
let parallel = require('run-parallel')
let rm = require('rimraf')

module.exports = function cleanup({appname}, callback) {
  let files = [
    `${appname}-cfn-events.json`,
    `${appname}-cfn-events.yaml`,
    `${appname}-cfn-http.json`,
    `${appname}-cfn-http.yaml`,
    `${appname}-cfn.json`,
    `${appname}-cfn.yaml`,
  ].map(f=> {
    return function deletes(callback) {
      fs.unlink(path.join(process.cwd(), f), function done() {
        callback()
      })
    }
  })
  parallel(files, function almostDone(err) {
    if (err) console.log(err)
    // Clean up temp dir from root proxy + fingerprint
    rm(path.join(process.cwd(), '__ARC_TMP__'), callback)
  })
}
