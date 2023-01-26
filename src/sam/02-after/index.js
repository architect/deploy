let series = require('run-series')
let appApex  = require('./00-get-app-apex')
let maybeInvalidate = require('./01-maybe-invalidate')
let deployWS = require('./02-deploy-ws')
let cleanup = require('./03-clean-up-artifacts')

module.exports = function after (params, callback) {
  series([
    appApex.bind({}, params),
    maybeInvalidate.bind({}, params),
    deployWS.bind({}, params),
    cleanup.bind({}, params),
  ], err => {
    if (err) callback(err)
    else callback()
  })
}
