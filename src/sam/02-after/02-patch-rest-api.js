let aws = require('aws-sdk')
let waterfall = require('run-waterfall')

module.exports = function patchApiGateway (params, callback) {
  let { legacyAPI, region, stackname, stage } = params
  if (legacyAPI) {
    waterfall([
      function (callback) {
        let cloudformation = new aws.CloudFormation({ region })
        cloudformation.describeStacks({
          StackName: stackname
        },
        function done (err, data) {
          if (err) console.log(err)
          else if (Array.isArray(data.Stacks)) {
            let outs = data.Stacks[0].Outputs
            let restApiId = outs.find(o => o.OutputKey === 'restApiId')
            if (!restApiId) callback(Error('cancel'))
            else callback(null, restApiId.OutputValue)
          }
          else {
            callback(Error('stack_not_found'))
          }
        })
      },
      function (restApiId, callback) {
        // update binary media types to */*
        let apigateway = new aws.APIGateway({ region })
        apigateway.updateRestApi({
          restApiId,
          patchOperations: [ {
            op: 'add',
            path: '/binaryMediaTypes/*~1*'
          } ]
        },
        function done (err) {
          if (err) callback(err)
          else callback(null, restApiId)
        })
      },
      function (restApiId, callback) {
        let apigateway = new aws.APIGateway({ region })
        apigateway.createDeployment({
          restApiId,
          stageName: stage
        },
        function done (err) {
          if (err) callback(err)
          else callback()
        })
      }
    ],
    function done (err) {
      if (err && err.message === 'cancel') callback()
      else if (err) callback(err)
      else callback()
    })
  }
  else callback()
}
