let series = require('run-series')
let waterfall = require('run-waterfall')
let zip = require('./zip')
let aws = require('aws-sdk')
let hydrate = require('@architect/hydrate')

/**
 * zips and uploads the function; overwrites its configuration based on any .arc-config found
 *
 * ...as quickly as possible
 *
 * @param {String} params.FunctionName - a valid lambda function name or arn
 * @param {String} params.lambda - Inventory Lambda object
 */
module.exports = function updateLambda (params, callback) {
  let { env, FunctionName, region, src, update } = params
  let lambda = new aws.Lambda({ region })

  // Check the Lambda lifecycle state after each mutation to prevent async update issues
  function checkin (count, callback) {
    if (count === 10) {
      callback(Error('Timed out waiting to perform Lambda update'))
    }
    else {
      lambda.getFunctionConfiguration({ FunctionName }, function (err, config) {
        if (err) callback(err)
        else if (config?.LastUpdateStatus !== 'Successful') {
          setTimeout(() => checkin(++count, callback), 200)
        }
        else callback()
      })
    }
  }

  series([
    // Hydrate the Lambda
    function (callback) {
      hydrate.install({ autoinstall: true, basepath: src }, callback)
    },

    // Zip its contents
    function (callback) {
      update.start('Publishing code to Lambda')
      waterfall([
        function (callback) {
          let { build, src } = params.lambda
          zip(build || src, callback)
        },
        function (buffer, callback) {
          lambda.updateFunctionCode({
            FunctionName,
            ZipFile: buffer
          }, callback)
        }
      ],
      function done (err) {
        update.done('Published code to Lambda')
        if (err) callback(err)
        else callback()
      })
    },

    // Publish the new payload (and update its configuration)
    function (callback) {
      let { timeout, memory, runtime, handler, concurrency, layers, policies } = params.lambda.config
      let args = {
        FunctionName,
        Handler: handler,
        MemorySize: memory,
        Timeout: timeout,
        Runtime: runtime,
      }
      if (layers.length > 0) args.Layers = layers
      if (policies.length > 0) args.Policies = policies

      series([
        function getFunctionConfiguration (callback) {
          let updateEnv = env && (params.lambda.config.env !== false)
          // TODO probably want to warn here somehow? Because of how Lambda config updates work and the env vars we have access to at this time, we can only reliably add/update env vars, not remove
          if (updateEnv) {
            update.start('Updating Lambda env vars')
            lambda.getFunctionConfiguration({ FunctionName }, function (err, config) {
              if (err) callback(err)
              else {
                args.Environment = {
                  Variables: { ...config.Environment.Variables, ...env }
                }
                update.done('Updated Lambda env vars')
                callback()
              }
            })
          }
          else callback()
        },
        function updateFunctionConfiguration (callback) {
          update.start('Updating Lambda configuration')
          checkin(0, err => {
            if (err) callback(err)
            else lambda.updateFunctionConfiguration(args, callback)
          })
        },
        function updateFunctionConcurrency (callback) {
          if (!concurrency || concurrency === 'unthrottled') {
            checkin(0, err => {
              if (err) callback(err)
              else lambda.deleteFunctionConcurrency({
                FunctionName,
              }, callback)
            })
          }
          else {
            checkin(0, err => {
              if (err) callback(err)
              else lambda.putFunctionConcurrency({
                FunctionName,
                ReservedConcurrentExecutions: concurrency,
              }, callback)
            })
          }
        }
      ], callback)
    }
  ],
  function done (err) {
    if (err) callback(err)
    else {
      update.done('Updated Lambda configuration')
      callback()
    }
  })
}
