let series = require('run-series')
let printUrl = require('./00-print-url')
let staticDeploy = require('./01-static-deploy')
let patchApiG = require('./02-patch-apig')
let cleanup = require('./03-cleanup')

module.exports = function after({ts, arc, verbose, production, pretty, appname, stackname}, callback) {
  series([
    printUrl.bind({}, {ts, pretty, stackname}),
    staticDeploy.bind({}, {arc, verbose, production}),
    patchApiG.bind({}, {stackname}),
    cleanup.bind({}, {appname}),
  ], callback)
}
