let _static = require('../../static')
let ran = false

module.exports = function staticDeploy (params, preDeploy, callback) {
  let { compat, eject, inventory: { inv }, isDryRun } = params
  if (eject || isDryRun) return callback()

  // It is safe to publish static assets pre-deploy if:
  // - Fingerprinting is enabled (including `external`, which we will assume was done properly)
  // - Pruning is disabled
  if (preDeploy && compat.hasStaticBucket &&
      inv.static?.fingerprint && !inv.static?.prune) {
    ran = true
    _static({ isFullDeploy: true, ...params }, callback)
  }
  else if (!preDeploy && !ran) {
    _static({ isFullDeploy: true, ...params }, callback)
  }
  else callback()
}
