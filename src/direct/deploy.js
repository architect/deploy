let { getLambdaName, toLogicalID } = require('@architect/utils')
let parallel = require('run-parallel')
let waterfall = require('run-waterfall')

let updateLambda = require('./update')
let pretty = require('./pretty')
let getResources = require('../utils/get-cfn-resources')

module.exports = function deploySAM (params, callback) {
  let {
    aws,
    inventory,
    production,
    region,
    shouldHydrate,
    specificLambdasToDeploy,
    stackname,
    ts,
    update,
  } = params
  let { inv } = inventory

  waterfall([

    function readResources (callback) {
      getResources({ aws, stackname }, function (err, resources) {
        if (err) callback(err)
        else {
          let find = i => i.ResourceType === 'AWS::Lambda::Function'
          let functions = resources.filter(find)
          callback(null, functions)
        }
      })
    },

    function readLocal (functions, callback) {
      let dirs = specificLambdasToDeploy.length
        ? specificLambdasToDeploy
        : inventory.inv.lambdaSrcDirs

      let deploying = []
      let lambdae = {
        events: 'Event',
        http: 'HTTP',
        queues: 'Queue',
        scheduled: 'Scheduled',
        'tables-streams': 'TableStream',
        ws: 'WS',
        customLambdas: 'Custom Lambdas',
      }
      Object.entries(lambdae).forEach(([ pragma, type ]) => {
        if (inv[pragma]) inv[pragma].filter(lambda => {
          if (dirs.some(d => lambda.src.endsWith(d))) {
            deploying.push({ ...lambda, type })
          }
        })
      })

      let stage = production ? 'production' : 'staging'
      let env = inv._project.env.aws?.[stage]

      parallel(deploying.map(lambda => {
        return function one (callback) {
          let { name, type, src } = lambda
          let dir = src.replace(process.cwd(), '').substr(1)
          let logicalID
          if (type === 'HTTP') {
            let lambdaName = getLambdaName(lambda.path)
            let id = toLogicalID(`${lambda.method}${lambdaName.replace(/000/g, '')}`)
            logicalID = `${id}HTTPLambda`
          }
          else {
            let lambdaName = getLambdaName(name)
            let id = toLogicalID(lambdaName)
            logicalID = `${id}${type}Lambda`
          }

          let found = functions.find(f => f.LogicalResourceId === logicalID)
          if (found) {
            let FunctionName = found.PhysicalResourceId
            update.status(`Deploying directly to: ${name} (${dir})`)
            updateLambda({
              aws,
              FunctionName,
              env,
              lambda,
              region,
              shouldHydrate,
              src,
              update,
            }, callback)
          }
          else {
            update.warn(`Lambda resource not found: ${name} (${dir})`)
            callback()
          }
        }
      }),
      function done (err) {
        if (err) callback(err)
        else {
          pretty.success(ts, update)
          callback()
        }
      })
    },

    function readURL (callback) {
      aws.cloudformation.DescribeStacks({ StackName: stackname })
        .then(data => {
          if (Array.isArray(data.Stacks)) {
            let outs = data.Stacks[0].Outputs
            let maybe = outs.find(o => o.OutputKey === 'API')
            if (maybe) pretty.url(maybe.OutputValue)
          }
          callback()
        })
        .catch(err => {
          if (err) console.log(err)
          callback()
        })
    },
  ], callback)
}
