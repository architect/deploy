let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let staticDeploy = require('./01-static-deploy')
let patchApiG = require('./02-patch-apig')
let cleanup = require('./03-cleanup')

module.exports = function after(params, callback) {
  let {ts, arc, verbose, production, pretty, appname, stackname, stage} = params
  series([
    appApex.bind({}, {ts, arc, pretty, stackname, stage}),
    staticDeploy.bind({}, {arc, verbose, production}),
    patchApiG.bind({}, {stackname, stage}),
    cleanup.bind({}, {appname}),
  ], callback)
}
