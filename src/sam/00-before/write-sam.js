let parallel = require('run-parallel')
let path = require('path')
let fs = require('fs')

module.exports = function writeSAM({nested, sam}, callback) {
  if (nested) {
    // writes appname-cfn.json, appname-cfn-http.json and appname-cfn-events.json
    parallel(Object.keys(sam).map(k=> {
      return function writeFile(callback) {
        fs.writeFile(k, JSON.stringify(sam[k], null, 2), callback)
      }
    }), callback)
  }
  else {
    // writes sam.json
    let name = path.join(process.cwd(), 'sam.json')
    fs.writeFile(name, JSON.stringify(sam, null, 2), callback)
  }
}
