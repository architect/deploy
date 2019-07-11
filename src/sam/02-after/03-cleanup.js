let fs = require('fs')
let path = require('path')
let parallel = require('run-parallel')

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
  parallel(files, callback)
}
