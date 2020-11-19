let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let staticDeploy = require('./01-static-deploy')
let patchRestAPI = require('./02-patch-rest-api')
let maybeInvalidate = require('./03-maybe-invalidate')
let cleanup = require('./04-cleanup')

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
    staticDeploy.bind({}, { inventory, production, prune, region, stackname, verbose }),
    patchRestAPI.bind({}, { legacyAPI, region, stackname, stage }),
    maybeInvalidate.bind({}, { inventory, region, stackname, stage }),
    cleanup,
  ], callback)
}
