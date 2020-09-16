let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let staticDeploy = require('./01-static-deploy')
let patchRestAPI = require('./02-patch-rest-api')
let maybeInvalidate = require('./03-maybe-invalidate')
let cleanup = require('./04-cleanup')

module.exports = function after (params, callback) {
  let {
    appname,
    arc,
    legacyAPI,
    pretty,
    production,
    prune,
    stackname,
    stage,
    ts,
    update,
    verbose,
  } = params

  series([
    appApex.bind({}, { ts, arc, pretty, stackname, stage, update }),
    staticDeploy.bind({}, { arc, verbose, stackname, production, prune }),
    patchRestAPI.bind({}, { legacyAPI, stackname, stage }),
    maybeInvalidate.bind({}, { arc, stackname, stage }),
    cleanup.bind({}, { appname }),
  ], callback)
}
