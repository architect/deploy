let aws = require('aws-sdk')
let { toLogicalID } = require('@architect/utils')
let series = require('run-series')

/**
 * Check current infra for backwards compat purposes
 */
module.exports = function compat (params, callback) {
  let { inv, stackname } = params
  let result = {}

  series([
    function getApiType (callback) {
      if (inv.http && !inv.aws.apigateway) {
        // Look for a legacy REST API in the stack; HTTP API resource IDs are simply 'HTTP'
        let resource = toLogicalID(inv.app)
        getResources(resource, stackname, callback, resources => {
          let api = resources[0] && resources[0].ResourceType
          result.legacyApi = api === 'AWS::ApiGateway::RestApi' ? true : false
          callback()
        })
      }
      else callback()
    },

    // There exists a fun bug in API Gateway V2 WebSockets that prevents renaming resources
    function getWSFormat (callback) {
      if (inv.ws) {
        // Look for older (pre Arc 8.3) WebSocket resources in the stack
        let resource = 'WebsocketDefaultRoute'
        getResources(resource, stackname, callback, resources => {
          result.earlierWS = resources.length ? true : false
          callback()
        })
      }
      else callback()
    }
  ], function done (err) {
    if (err) callback(err)
    else callback(null, result)
  })
}

// Reusable CloudFormation resource getter: feed it a resource ID and stand back
function getResources (LogicalResourceId, StackName, callback, next) {
  let cfn = new aws.CloudFormation()
  // Prefer describeStackResources against multiple specific known LogicalResourceIds
  // (as opposed to paginating & searching)
  cfn.describeStackResources({
    StackName,
    LogicalResourceId
  }, function done (err, stack) {
    // First run (until they change the error message, anyway)
    if (err && err.message === `Stack with id ${StackName} does not exist`) callback()
    else if (err) callback(err)
    else next(stack.StackResources)
  })
}
