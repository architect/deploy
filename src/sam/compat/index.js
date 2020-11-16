let aws = require('aws-sdk')
let { toLogicalID } = require('@architect/utils')
let series = require('run-series')

/**
 * Check current infra for backwards compat purposes
 */
module.exports = function compat (params, callback) {

  let { inv, stackname: StackName } = params
  let cfn = new aws.CloudFormation()
  let result = {}

  // Prefer describeStackResources against multiple specific known LogicalResourceIds (vs paginating & searching)
  series([
    function getApiType (callback) {
      if (inv.http) {
        // Look for a legacy REST API in the stack; HTTP API resource IDs are simply 'HTTP'
        let LogicalResourceId = toLogicalID(inv.app)
        cfn.describeStackResources({
          StackName,
          LogicalResourceId
        }, function done (err, stack) {
          // First run
          if (err && err.message === `Stack with id ${StackName} does not exist`) callback()
          else if (err) callback(err)
          else {
            let api = stack.StackResources[0] && stack.StackResources[0].ResourceType
            result.legacyApi = api === 'AWS::ApiGateway::RestApi' ? true : false
            callback()
          }
        })
      }
      else callback()
    }
  ], function done (err) {
    if (err) callback(err)
    else callback(null, result)
  })
}
