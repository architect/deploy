let { join } = require('path')
let { rmSync } = require('fs')

// Best effort local artifact cleanup
module.exports = function cleanup () {
  try {
    // Clean up temp dir from root proxy + fingerprint
    let tmp = join(process.cwd(), '__ARC_TMP__')
    rmSync(tmp, { recursive: true, force: true })
  }
  catch (err) {
    // Don't blow up on errors, we may have to bubble something else
    console.error(`Failed to clean up deployment temp directory: ${process.cwd(), '__ARC_TMP__'}`)
  }
}
