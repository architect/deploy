let aws = require('aws-sdk')
let utils = require('@architect/utils')
let parallel = require('run-parallel')
let waterfall = require('run-waterfall')

let deploy = require('./deploy-one')
let pretty = require('./pretty')

module.exports = function deploySAM({stackname, arc, ts}, callback) {
  waterfall([

    function readResources(callback) {
      let cloudformation = new aws.CloudFormation
      cloudformation.listStackResources({
        StackName: stackname
      },
      function done(err, data) {
        if (err) callback(err)
        else {
          let find = i=> i.ResourceType === 'AWS::Lambda::Function'
          let functions = data.StackResourceSummaries.filter(find)
          callback(null, functions)
        }
      })
    },

    function readLocal(functions, callback) {
      let {localPaths} = utils.inventory(arc)
      parallel(localPaths.map(pathToCode=> {
        return function one(callback) {
          let folder = pathToCode.split('/').reverse().shift()
          let isWS = pathToCode.startsWith('src/ws')
          let logicalID = utils.toLogicalID(isWS? `websocket-${folder.replace('000', '').replace('ws-', '')}` : folder.replace('000', ''))
          let found = functions.find(f=> f.LogicalResourceId === logicalID)
          if (found) {
            let FunctionName = found.PhysicalResourceId
            deploy({
              FunctionName,
              pathToCode: pathToCode.replace('ws-', ''),
              arc,
            }, callback)
          }
          else {
            console.warn(`${pathToCode} logical id ${logicalID} not found`)
            callback()
          }
        }
      }),
      function done(err) {
        if (err) callback(err)
        else {
          pretty.success(ts)
          callback()
        }
      })
    },

    function readURL(callback) {
      let cloudformation = new aws.CloudFormation
      cloudformation.describeStacks({
        StackName: stackname
      },
      function done(err, data) {
        if (err) console.log(err)
        else if (Array.isArray(data.Stacks)) {
          let outs = data.Stacks[0].Outputs
          let maybe = outs.find(o=> o.OutputKey === 'API')
          if (maybe)
            pretty.url(maybe.OutputValue)
        }
        callback()
      })
    }

  ], callback)
}
