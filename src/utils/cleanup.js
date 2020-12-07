let { existsSync, readFileSync } = require('fs')
let { join } = require('path')
let { sync: rm } = require('rimraf')

// Best effort local artifact cleanup
module.exports = function cleanup (inventory) {
  try {
    // Destroy any auto-installed artifacts
    let { inv } = inventory
    inv.lambdaSrcDirs.forEach(dir => {
      let marker = join(dir, '.arc-autoinstall')
      let autoinstalled = existsSync(marker)
      if (autoinstalled) {
        let files = readFileSync(marker).toString().split('\n')
        files.forEach(file => rm(join(dir, file)))
        rm(marker)
      }
    })

    // Clean up temp dir from root proxy + fingerprint
    rm(join(process.cwd(), '__ARC_TMP__'))
  }
  catch (err) { null } // Swallow errors, we may have to bubble something else
}
