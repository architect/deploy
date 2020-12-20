let { join } = require('path')
let { sync: rm } = require('rimraf')

// Best effort local artifact cleanup
module.exports = function cleanup () {
  try {
    // Clean up temp dir from root proxy + fingerprint
    rm(join(process.cwd(), '__ARC_TMP__'))
  }
  catch (err) { null } // Swallow errors, we may have to bubble something else
}
