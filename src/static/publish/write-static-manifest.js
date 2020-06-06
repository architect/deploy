let { existsSync, readFileSync } = require('fs')
let { join } = require('path')
let { fingerprint: fingerprinter } = require('@architect/utils')

/**
 * Write (or remove) fingerprinted static asset manifest if not run as a full deploy
 */
module.exports = function maybeWriteStaticManifest (params, callback) {
  let { fingerprint, ignore, isFullDeploy, publicDir } = params

  let staticFile = join(publicDir, 'static.json')
  let staticFileExists = existsSync(staticFile)
  let useExistingStaticManifest = isFullDeploy && fingerprint && staticFileExists

  if (useExistingStaticManifest) {
    // Use the static manifest already written to disk if run as a full deploy
    let manifest = JSON.parse(readFileSync(staticFile))
    callback(null, manifest)
  }
  else {
    // Let the fingerprinter sort it out
    fingerprinter({fingerprint, ignore}, callback)
  }
}
