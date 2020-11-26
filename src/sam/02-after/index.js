let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let staticDeploy = require('../../static')
let patchRestAPI = require('./02-patch-rest-api')
let maybeInvalidate = require('./03-maybe-invalidate')
let deployWS = require('./04-deploy-ws')
let cleanup = require('./05-cleanup')

module.exports = function after (params, callback) {
  let {
    inventory,
    legacyAPI,
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
    appApex.bind({}, { inventory, legacyAPI, pretty, region, stackname, stage, ts, update }),
    staticDeploy.bind({}, { inventory, isFullDeploy: true, production, prune, region, stackname, verbose, update }),
    patchRestAPI.bind({}, { legacyAPI, region, stackname, stage }),
    maybeInvalidate.bind({}, { inventory, region, stackname, stage }),
    deployWS.bind({}, { inventory, region, stackname, stage }),
    cleanup,
  ], callback)
}
