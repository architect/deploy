let series = require('run-series')
let parse = require('@architect/parser')
let fs = require('fs')
let path = require('path')
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
 * @param {String} params.pathToCode - path on filesystem to function code
 */
module.exports = function dirtyDeployOne({FunctionName, pathToCode}, callback) {
  parallel({
    code(callback) {
      updateCode({
        FunctionName,
        pathToCode,
      }, callback)
    },
    config(callback) {
      updateConfig({
        FunctionName,
        pathToCode,
      }, callback)
    }
  },
  function done(err) {
    if (err) callback(err)
    else callback()
  })
}

/**
 * zip path/to/code and dirty updates lambda function
 */
function updateCode({FunctionName, pathToCode}, callback) {
  sploot([
    function(callback) {
      zip(pathToCode, callback)
    },
    function(buffer, callback) {
      let lambda = new aws.Lambda
      lambda.updateFunctionCode({
        FunctionName,
        ZipFile: buffer
      }, callback)
    }
  ],
  function done(err) {
    if (err) callback(err)
    else callback()
  })
}

/**
 * reads path/to/code/.arc-config and dirty updates lambda function config
 */
function updateConfig({FunctionName, pathToCode}, callback) {
  let lambda = new aws.Lambda
  let configPath = path.join(pathToCode, '.arc-config')
  if (fs.existsSync(configPath)) {
    fs.readFile(configPath, 'utf8', function done(err, body) {
      if (err) callback()
      else {
        let configuration = parse(body.toString())
        if (!configuration.aws) {
          callback()
        }
        else {
          // turn {aws:[['timeout', 3], ['runtime', 'ruby2.5']]
          // into {timeout:3, runtime:'ruby2.5'}
          let pivot = configuration.aws.reduce((a, tuple)=> {
            a[tuple[0]] = tuple[1]
            return a
          }, {})
          // override function configuration
          let params = {FunctionName}
          if (pivot.memory)
            params.MemorySize = pivot.memory
          if (pivot.timeout)
            params.Timeout = pivot.timeout
          if (pivot.runtime)
            params.Runtime = pivot.runtime
          if (pivot.layers)
            params.Layers = pivot.layers
          series([
            function updateFunctionConfiguration(callback) {
              setTimeout(function rateLimit() {
                lambda.updateFunctionConfiguration(params, callback)
              }, 200)
            },
            function updateFunctionConcurrency(callback) {
              if (!pivot.concurrency || pivot.concurrency === 'unthrottled') {
                setTimeout(function rateLimit() {
                  lambda.deleteFunctionConcurrency({
                    FunctionName,
                  }, callback)
                }, 200)
              }
              else {
                setTimeout(function rateLimit() {
                  lambda.putFunctionConcurrency({
                    FunctionName,
                    ReservedConcurrentExecutions: pivot.concurrency,
                  }, callback)
                }, 200)
              }
            }
          ], callback)
        }
      }
    })
  }
  else {
    callback()
  }
}
