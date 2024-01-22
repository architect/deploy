let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let deployWS = require('./01-deploy-ws')
let prune = require('../../static')
let cleanup = require('./02-clean-up-artifacts')

module.exports = function after (params, callback) {
  let bucket = undefined // Important, otherwise prune will destroy cfn deployment artifacts instead
  series([
    prune.bind({}, { ...params, deployAction: 'delete', bucket }),
    appApex.bind({}, params),
    deployWS.bind({}, params),
    cleanup.bind({}, params),
  ], err => {
    if (err) callback(err)
    else callback()
  })
}
