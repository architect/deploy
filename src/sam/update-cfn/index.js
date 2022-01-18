let legacyAPI = require('./_legacy-api')
let fixOldCfn = require('./_old-cfn')
let asap = require('./_asap')

module.exports = function updateCfn (params, callback) {
  let { cloudformation } = params

  // Use legacy REST APIs instead of HTTP APIs for @http; must run before other macros
  cloudformation = legacyAPI(params)

  // Use older WebSocket route resource names due to an API Gateway / cfn bug
  cloudformation = fixOldCfn(params)

  // Handle placement of fingerprinting + ASAP files
  cloudformation = asap(params)

  callback(null, cloudformation)
}
