let aws = require('aws-sdk')
let waterfall = require('run-waterfall')

module.exports = function patchApiGateway({stackname, stage}, callback) {
  waterfall([
    function(callback) {
      let cloudformation = new aws.CloudFormation
      cloudformation.describeStacks({
        StackName: stackname
      },
      function done(err, data) {
        if (err) console.log(err)
        else if (Array.isArray(data.Stacks)) {
          let outs = data.Stacks[0].Outputs
          let restApiId = outs.find(o=> o.OutputKey === 'restApiId')
          if (!restApiId) callback(Error('cancel'))
          else callback(null, restApiId.OutputValue)
        }
        else {
          callback(Error('stack_not_found'))
        }
      })
    },
    function(restApiId, callback) {
      // update binary media types to */*
      let apigateway = new aws.APIGateway
      apigateway.updateRestApi({
        restApiId,
        patchOperations: [
          /**
           * Just a sampling of binary types
           *   use: https://github.com/architect/functions/blob/master/src/http/helpers/binary-types.js
           *   also: folks can add / alter their own with macros
           */
          {
            op: 'add',
            path: '/binaryMediaTypes/application~1octet-stream'
          },
          {
            op: 'add',
            path: '/binaryMediaTypes/image~1jpeg',
          },
          {
            op: 'add',
            path: '/binaryMediaTypes/image~1png',
          }
        ]
      },
      function done(err) {
        if (err) callback(err)
        else callback(null, restApiId)
      })
    },
    function(restApiId, callback) {
      let apigateway = new aws.APIGateway
      apigateway.createDeployment({
        restApiId,
        stageName: stage
      },
      function done(err) {
        if (err) callback(err)
        else callback()
      })
    }
  ],
  function done(err) {
    if (err && err.message === 'cancel') callback()
    else if (err) callback(err)
    else callback()
  })
}
