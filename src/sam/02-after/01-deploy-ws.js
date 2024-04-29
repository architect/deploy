let series = require('run-series')

/**
 * API Gateway / CFN bug!
 * If @ws was created pre-Arc 8.3, API Gateway v2 will fail to deploy itself after cfn resource names changed
 * Hopefully we can yank this process out when they one day fix this
 */
module.exports = function deployOldWebSocketAPI (params, callback) {
  let { aws, inventory, compat, stackname, stage: StageName } = params
  let { inv } = inventory

  if (inv.ws && compat.foundEarlierWS) {
    let ApiId
    let DeploymentId

    series([
      function describe (callback) {
        aws.cloudformation.DescribeStacks({ StackName: stackname })
          .then(cfn => {
            try {
              let outs = cfn.Stacks[0].Outputs
              let ws = o => o.OutputKey === 'WSS'
              let api = outs.find(ws)
              if (!api || !api.OutputValue) throw Error()
              ApiId = api.OutputValue.split('.')[0].replace('wss://', '')
              callback()
            }
            catch {
              callback(ReferenceError('Cannot find WebSocket API in CloudFormation stack'))
            }
          })
          .catch(callback)
      },

      // We should only be responsible for an APIG deployment "patch" once, after that it's on AWS
      function maybeBailEarly (callback) {
        aws.apigatewayv2.GetDeployments({ ApiId, paginate: true })
          .then(result => {
            if (!result.Items) callback(Error('Cannot find WebSocket API deployments'))
            else {
              let patched = result.Items.find(i => i?.Description === 'arc_apig_cfn_patch')
              if (patched) callback('cancel')
              else callback()
            }
          })
          .catch(callback)
      },

      function deploy (callback) {
        aws.apigatewayv2.CreateDeployment({
          ApiId,
          Description: 'arc_apig_cfn_patch',
        })
          .then(result => {
            if (!result?.DeploymentId) {
              callback(Error('Failed to create WebSocket API deployment'))
            }
            else {
              DeploymentId = result.DeploymentId
              callback()
            }
          })
          .catch(callback)
      },

      function update (callback) {
        aws.apigatewayv2.UpdateStage({
          ApiId,
          StageName,
          DeploymentId,
        })
          .then(() => callback())
          .catch(callback)
      },
    ], function done (err) {
      if (err && err === 'cancel') callback()
      else if (err) callback(err)
      else callback()
    })
  }
  else callback()
}
