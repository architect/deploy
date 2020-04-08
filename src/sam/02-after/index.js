let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let staticDeploy = require('./01-static-deploy')
let patchApiG = require('./02-patch-apig')
let maybeInvalidate = require('./03-maybe-invalidate')
let cleanup = require('./04-cleanup')

module.exports = function after(params, callback) {
  let {ts, arc, verbose, production, pretty, appname, stackname, stage, update} = params
  series([
    appApex.bind({}, {ts, arc, pretty, stackname, stage, update}),
    staticDeploy.bind({}, {arc, verbose, stackname, production}),
    patchApiG.bind({}, {stackname, stage}),
    maybeInvalidate.bind({}, {stackname, stage}),
    cleanup.bind({}, {appname}),
  ], callback)
}
