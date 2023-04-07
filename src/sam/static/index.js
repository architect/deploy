let _static = require('../../static')
let ran = false

module.exports = function staticDeploy (params, preDeploy, callback) {
  let { compat, inventory: { inv } } = params

  // It is safe to publish static assets pre-deploy if:
  // - Fingerprinting is enabled (including `external`, which we will assume was done properly)
  if (preDeploy && compat.hasStaticBucket && inv.static?.fingerprint) {
    ran = true
    _static({ deployAction: 'put', ...params }, callback)
  }
  else if (!preDeploy && !ran) {
    _static({ deployAction: 'put', ...params }, callback)
  }
  else callback()
}
