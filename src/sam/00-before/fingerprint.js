let utils = require('@architect/utils')
let fingerprinter = utils.fingerprint
let fingerprintConfig = fingerprinter.config

/**
 * If static asset fingerprint is enabled, write the manifest prior to hydration
 */
module.exports = function fingerprinting (params={}, callback) {
  let {update, verbose} = params
  let {arc} = utils.readArc()

  // Enable fingerprinting
  let fingerprint = fingerprintConfig(arc).fingerprint

  // Collect any strings to match against for ignore
  let ignore = fingerprintConfig(arc).ignore

  if (fingerprint || verbose)
    update.done(`Static asset fingerpringing ${fingerprint ? 'enabled' : 'disabled'}`)

  if (fingerprint) {
    fingerprinter({fingerprint, ignore}, function done(err) {
      if (err) {
        callback(err)
      }
      else {
        callback()
      }
    })
  }
  else {
    callback()
  }
}
