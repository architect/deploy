let aws = require('aws-sdk')
let utils = require('@architect/utils')
let parallel = require('run-parallel')
let waterfall = require('run-waterfall')

let deploy = require('./deploy-one')
let pretty = require('./pretty')

module.exports = function deploySAM({stackname, arc, ts}, callback) {
  // To see a World in a Grain of Sand,
  // And a Heaven in a Wild Flower,
  // Hold Infinity in the palm of your hand,
  // And Eternity in an hour.
  let cloudformation = new aws.CloudFormation
  waterfall([

    function readStax(callback) {
      cloudformation.listStackResources({
        StackName: stackname
      },
      function done(err, data) {
        if (err) callback(err)
        else {
          let find = i=> i.ResourceType === 'AWS::CloudFormation::Stack'
          let stax = data.StackResourceSummaries.filter(find)
          callback(null, stax)
        }
      })
    },

    function readSubStax(stax, callback) {
      parallel(stax.map(stack=> {
        return function getResources(callback) {
          let StackName = stack.PhysicalResourceId
          let results = []
          function walk(params={}) {
            cloudformation.listStackResources(params, function done(err, {NextToken, StackResourceSummaries}) {
              if (err) callback(err)
              else if (NextToken) {
                results = results.concat(StackResourceSummaries)
                walk({StackName, NextToken})
              }
              else {
                results = results.concat(StackResourceSummaries)
                callback(null, results)
              }
            })
          }
          walk({StackName})
        }
      }),
      function done(err, result) {
        if (err) callback(err)
        else {
          let reduced = result.reduce((a, b)=> a.concat(b), [])
          let isfun = i=> i.ResourceType === 'AWS::Lambda::Function'
          let fun = reduced.filter(isfun)
          callback(null, fun)
        }
      })
    },

    function readLocal(functions, callback) {
      let {localPaths} = utils.inventory(arc)
      parallel(localPaths.map(pathToCode=> {
        return function one(callback) {
          let folder = pathToCode.split('/').reverse().shift()
          let logicalID = utils.toLogicalID(folder.replace(/000/g, ''))
          let found = functions.find(f=> f.LogicalResourceId === logicalID)
          if (found) {
            let FunctionName = found.PhysicalResourceId
            deploy({
              FunctionName,
              pathToCode,
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
        else if (data && Array.isArray(data.Stacks)) {
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

