let { join } = require('path')
let rm = require('rimraf')

module.exports = function cleanup (callback) {
  // Clean up temp dir from root proxy + fingerprint
  rm(join(process.cwd(), '__ARC_TMP__'), callback)
}
