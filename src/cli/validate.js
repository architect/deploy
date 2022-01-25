let { updater } = require('@architect/utils')
let { delimiter, join } = require('path')
let { existsSync } = require('fs')

let messages = {
  missing_aws_cli: 'missing aws from PATH, please install the aws-cli',
  missing_creds: 'missing or invalid AWS credentials or credentials file',
}

/**
 * Deploy CLI environment validator
 */
module.exports = function validate () {
  try {
    if (process.env.ARC_AWS_CREDS === 'missing') {
      throw Error('missing_creds')
    }
    if (!binExists('aws')) {
      throw ReferenceError('missing_aws_cli')
    }
  }
  catch (e) {
    let update = updater('Deploy')
    update.error(`Failed to deploy, ${messages[e.message]}`)
    process.exit(1)
  }
}

function binExists (bin) {
  function getPaths (bin) {
    let envPath = (process.env.PATH || '')
    let envExt = (process.env.PATHEXT || '')
    return envPath.replace(/["]+/g, '').split(delimiter).map(function (chunk) {
      return envExt.split(delimiter).map(function (ext) {
        return join(chunk, bin + ext)
      })
    }).reduce(function (a, b) {
      return a.concat(b)
    })
  }
  return getPaths(bin).some(existsSync)
}
