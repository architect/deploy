let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let staticDeploy = require('../../static')
let maybeInvalidate = require('./03-maybe-invalidate')
let deployWS = require('./04-deploy-ws')
let warnings = require('./05-warnings')

module.exports = function after (params, callback) {
  let {
    inventory,
    legacyCompat,
    pretty,
    production,
    prune,
    region,
    stackname,
    stage,
    ts,
    update,
    verbose,
  } = params

  series([
    appApex.bind({}, { inventory, pretty, region, stackname, stage, ts, update }),
    staticDeploy.bind({}, { inventory, isFullDeploy: true, production, prune, region, stackname, verbose, update }),
    maybeInvalidate.bind({}, { inventory, region, stackname, stage }),
    deployWS.bind({}, { inventory, legacyCompat, region, stackname, stage }),
    warnings.bind({}, { inventory, update })
  ], callback)
}
