let { toLogicalID } = require('@architect/utils')
let series = require('run-series')

/**
 * Check current infra for compatibility
 */
module.exports = function compat (params, callback) {
  let { aws, inv, stackname } = params
  let result = {}

  series([
    function getApiType (callback) {
      if (inv.http && (!inv.aws.apigateway || inv.aws.apigateway === 'rest')) {
        let deployPlugins = inv.plugins?._methods?.deploy?.start
        let hasRestPlugin = deployPlugins?.find(({ _plugin }) => _plugin === 'architect/plugin-rest-api')

        // Look for a legacy REST API in the stack; HTTP API resource IDs are simply 'HTTP'
        let resource = toLogicalID(inv.app)
        getResources(aws, resource, stackname, callback, resources => {
          let api = resources[0] && resources[0].ResourceType
          if (api === 'AWS::ApiGateway::RestApi' && !hasRestPlugin) {
            let msg = 'Architect REST APIs are now supported via `@architect/plugin-rest-api`; please install that plugin and add `apigateway rest` to your @aws pragma'
            callback(Error(msg))
          }
          else callback()
        })
      }
      else callback()
    },

    // There exists a fun bug in API Gateway V2 WebSockets that prevents renaming resources
    function getWSFormat (callback) {
      if (inv.ws) {
        // Look for older (pre Arc 8.3) WebSocket resources in the stack
        let resource = 'WebsocketDefaultRoute'
        getResources(aws, resource, stackname, callback, resources => {
          result.foundEarlierWS = resources.length ? true : false
          callback()
        })
      }
      else callback()
    },

    function getEventsParam (callback) {
      if (inv.events) {
        // Look for older (pre Arc 8.3) WebSocket resources in the stack
        let resource = `${toLogicalID(inv.events[0].name)}TopicParam`
        getResources(aws, resource, stackname, callback, resources => {
          result.foundEarlierEvents = resources.length ? true : false
          callback()
        })
      }
      else callback()
    },

    function getBucket (callback) {
      if (inv.static) {
        let resource = 'StaticBucket'
        getResources(aws, resource, stackname, callback, resources => {
          result.hasStaticBucket = resources.length ? true : false
          callback()
        })
      }
      else callback()
    },

  ], function done (err) {
    if (err) callback(err)
    else callback(null, result)
  })
}

// Reusable CloudFormation resource getter: feed it a resource ID and stand back
function getResources (aws, LogicalResourceId, StackName, callback, next) {
  // Prefer describeStackResources against multiple specific known LogicalResourceIds
  // (as opposed to paginating & searching)
  aws.cloudformation.DescribeStackResources({
    StackName,
    LogicalResourceId,
  })
    .then(stack => next(stack.StackResources))
    .catch(err => {
      // First run (until they change the error message, anyway)
      if (err.message.includes(`Stack with id ${StackName} does not exist`)) callback()
      else callback(err)

    })
}
