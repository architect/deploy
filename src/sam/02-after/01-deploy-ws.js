let series = require('run-series')
let aws = require('aws-sdk')

/**
 * API Gateway / CFN bug!
 * If @ws was created pre-Arc 8.3, API Gateway v2 will fail to deploy itself after cfn resource names changed
 * Hopefully we can yank this process out when they one day fix this
 */
module.exports = function deployOldWebSocketAPI (params, callback) {
  let { inventory, compat, region, stackname, stage: StageName } = params
  let { inv } = inventory

  if (inv.ws && compat.foundEarlierWS) {
    let cloudformation = new aws.CloudFormation({ region })
    let apig = new aws.ApiGatewayV2({ region })
    let ApiId
    let DeploymentId

    series([
      function describe (callback) {
        cloudformation.describeStacks({
          StackName: stackname
        }, function done (err, cfn) {
          if (err) callback(err)
          else {
            try {
              let outs = cfn.Stacks[0].Outputs
              let ws = o => o.OutputKey === 'WSS'
              let api = outs.find(ws)
              if (!api || !api.OutputValue) throw Error()
              ApiId = api.OutputValue.split('.')[0].replace('wss://', '')
              callback()
            }
            catch (err) {
              callback(ReferenceError('Cannot find WebSocket API in CloudFormation stack'))
            }
          }
        })
      },

      // We should only be responsible for an APIG deployment "patch" once, after that it's on AWS
      function maybeBailEarly (callback) {
        function getDeployments (NextToken) {
          let params = { ApiId }
          if (NextToken) params.NextToken = NextToken
          apig.getDeployments(params, function (err, result) {
            if (err) callback(err)
            else if (!result.Items) callback(Error('Cannot find WebSocket API deployments'))
            else {
              let patched = result.Items.find(i => i.Description && i.Description === 'arc_apig_cfn_patch')
              let next = result.NextToken
              if (patched) callback('cancel')
              else if (next) getDeployments(next)
              else callback() // We ran out of pages, now create the APIG patch
            }
          })
        }
        getDeployments()
      },

      function deploy (callback) {
        apig.createDeployment({
          ApiId,
          Description: 'arc_apig_cfn_patch'
        },
        function done (err, result) {
          if (err) callback(err)
          else if (!result || !result.DeploymentId) {
            callback(Error('Failed to create WebSocket API deployment'))
          }
          else {
            DeploymentId = result.DeploymentId
            callback()
          }
        })
      },

      function update (callback) {
        apig.updateStage({
          ApiId,
          StageName,
          DeploymentId
        }, callback)
      }
    ], function done (err) {
      if (err && err === 'cancel') callback()
      else if (err) callback(err)
      else callback()
    })
  }
  else callback()
}
