let inventory = require('@architect/inventory')
let { updater } = require('@architect/utils')
let direct = require('./src/direct')
let sam = require('./src/sam')
let _static = require('./src/static')

function run (mod) {
  return function (options, callback) {
    let promise
    if (!callback) {
      promise = new Promise(function ugh (res, rej) {
        callback = function errback (err, result) {
          if (err) rej(err)
          else res(result)
        }
      })
    }

    // Get inventory, but don't fetch env vars if it's a dry-run
    inventory({ env: !options.isDryRun }, function (err, inv) {
      if (err) callback(err)
      else {
        options.update = updater('Deploy')
        mod(inv, options, callback)
      }
    })

    return promise
  }
}

module.exports = {
  direct: run(direct),
  dirty:  run(direct), // Deprecated name
  sam:    run(sam),
  static: run(_static)
}
