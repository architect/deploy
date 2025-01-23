let series = require('run-series')
let waterfall = require('run-waterfall')
let zip = require('./zip')
let hydrate = require('@architect/hydrate')

/**
 * zips and uploads the function; overwrites its configuration based on any .arc-config found
 *
 * ...as quickly as possible
 *
 * @param {Object} params - updateLambda parameters
 * @param {Object} params.aws - aws-lite client
 * @param {Object} params.env - environment variables
 * @param {String} params.FunctionName - a valid lambda function name or arn
 * @param {Object} params.lambda - Inventory Lambda object
 * @param {Boolean} params.shouldHydrate - whether to hydrate the function
 * @param {String} params.src - source code path
 * @param {Object} params.update - architect/utils updater
 * @param {Function} callback
 */
module.exports = function updateLambda (params, callback) {
  let {
    aws,
    env,
    FunctionName,
    shouldHydrate,
    src,
    update,
  } = params

  // Check the Lambda lifecycle state after each mutation to prevent async update issues
  // 40x checks every 250ms = 10s
  function checkin (count, callback) {
    if (count === 40) {
      callback(Error('Timed out waiting to perform Lambda update'))
    }
    else {
      aws.lambda.GetFunctionConfiguration({ FunctionName })
        .then(config => {
          if (config?.LastUpdateStatus === 'InProgress') {
            setTimeout(() => checkin(++count, callback), 250)
          }
          else if (config?.LastUpdateStatus === 'Failed') {
            callback(Error('Lambda update error'))
          }
          // Only three states: InProgress, Failed, or Successful
          else callback()
        })
        .catch(callback)
    }
  }

  series([
    // Hydrate the Lambda
    function (callback) {
      if (shouldHydrate) {
        hydrate.install({ autoinstall: true, basepath: src }, callback)
      }
      else callback()
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
          let { architecture } = params.lambda.config
          aws.lambda.UpdateFunctionCode({
            FunctionName,
            ZipFile: buffer,
            Architectures: [ architecture ],
          })
            .then(() => callback())
            .catch(callback)
        },
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
            aws.lambda.GetFunctionConfiguration({ FunctionName })
              .then(config => {
                args.Environment = {
                  Variables: { ...config.Environment.Variables, ...env },
                }
                update.done('Updated Lambda env vars')
                callback()
              })
              .catch(callback)
          }
          else callback()
        },
        function updateFunctionConfiguration (callback) {
          update.start('Updating Lambda configuration')
          checkin(0, err => {
            if (err) callback(err)
            else aws.lambda.UpdateFunctionConfiguration(args)
              .then(() => callback())
              .catch(callback)
          })
        },
        function updateFunctionConcurrency (callback) {
          if (!concurrency || concurrency === 'unthrottled') {
            checkin(0, err => {
              if (err) callback(err)
              else aws.lambda.DeleteFunctionConcurrency({ FunctionName })
                .then(() => callback())
                .catch(callback)
            })
          }
          else {
            checkin(0, err => {
              if (err) callback(err)
              else aws.lambda.PutFunctionConcurrency({
                FunctionName,
                ReservedConcurrentExecutions: concurrency,
              })
                .then(() => callback())
                .catch(callback)
            })
          }
        },
      ], callback)
    },
  ],
  function done (err) {
    if (err) callback(err)
    else {
      update.done('Updated Lambda configuration')
      callback()
    }
  })
}
