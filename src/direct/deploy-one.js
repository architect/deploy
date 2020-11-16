let series = require('run-series')
let parallel = require('run-parallel')
let sploot = require('run-waterfall')
let zip = require('./zip')
let aws = require('aws-sdk')

/**
 * zips and uploads the function; overwrites its configuration based on any .arc-config found
 *
 * ...as quickly as possible
 *
 * @param {String} params.FunctionName - a valid lambda function name or arn
 * @param {String} params.lambda - Inventory Lambda object
 */
module.exports = function directDeployOne (params, callback) {
  parallel({
    code (callback) {
      updateCode(params, callback)
    },
    config (callback) {
      updateConfig(params, callback)
    }
  },
  function done (err) {
    if (err) callback(err)
    else callback()
  })
}

/**
 * zip path/to/code and direct updates lambda function
 */
function updateCode ({ FunctionName, lambda }, callback) {
  let { src } = lambda
  sploot([
    function (callback) {
      zip(src, callback)
    },
    function (buffer, callback) {
      let lambda = new aws.Lambda({ region: process.env.AWS_REGION })
      lambda.updateFunctionCode({
        FunctionName,
        ZipFile: buffer
      }, callback)
    }
  ],
  function done (err) {
    if (err) callback(err)
    else callback()
  })
}

/**
 * reads path/to/code/.arc-config and direct updates lambda function config
 */
function updateConfig (params, callback) {
  let { FunctionName } = params
  let { timeout, memory, runtime, handler, concurrency, layers, policies } = params.lambda.config

  let lambda = new aws.Lambda({ region: process.env.AWS_REGION })

  let args = {
    FunctionName,
    Handler: handler,
    MemorySize: memory,
    Timeout: timeout,
    Runtime: runtime,
    // TODO addme! (need stage)
    // Environment: {
    //   Variables: {}
    // },
  }
  if (layers.length > 0) args.Layers = layers
  if (policies.length > 0) args.Policies = policies

  series([
    function updateFunctionConfiguration (callback) {
      setTimeout(function rateLimit () {
        lambda.updateFunctionConfiguration(args, callback)
      }, 200)
    },
    function updateFunctionConcurrency (callback) {
      if (!concurrency || concurrency === 'unthrottled') {
        setTimeout(function rateLimit () {
          lambda.deleteFunctionConcurrency({
            FunctionName,
          }, callback)
        }, 200)
      }
      else {
        setTimeout(function rateLimit () {
          lambda.putFunctionConcurrency({
            FunctionName,
            ReservedConcurrentExecutions: concurrency,
          }, callback)
        }, 200)
      }
    }
  ], callback)
}
