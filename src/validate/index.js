let utils = require('@architect/utils')
let chalk = require('chalk')
let path = require('path')
let fs = require('fs')

let messages = {
  missing_aws_cli: 'missing aws from PATH please install the aws-cli',
  missing_aws: 'missing aws in .arc',
  missing_bucket: 'missing @aws bucket in .arc for cloudformation deploy',
  missing_region: 'missing AWS_REGION',
  missing_profile: 'missing AWS_PROFILE',
  not_found: 'missing .arc file',
}

let pretty = {
  fail(msg) {
    let fail = 'Failed to deploy'
    let b = chalk.bgRed.bold.white
    let w = chalk.yellow
    console.log(b(fail), w(messages[msg]))
  }
}

module.exports = function validate(/*opts*/) {
  try {
    let {arc} = utils.readArc()

    if (!binExists('aws'))
      throw ReferenceError('missing_aws_cli')

    if (!process.env.AWS_REGION)
      throw Error('missing_region')

    if (!process.env.AWS_PROFILE)
      throw Error('missing_profile')

    if (!arc.aws)
      throw Error('missing_aws')

    let hasBucket = arc.aws && arc.aws.some(tuple=> tuple[0] === 'bucket')
    if (!hasBucket)
      throw Error('missing_bucket')

  }
  catch(e) {
    pretty.fail(e.message)
    process.exit(1)
  }
}

function binExists(bin) {
  function getPaths(bin) {
    var envPath = (process.env.PATH || '')
    var envExt = (process.env.PATHEXT || '')
    return envPath.replace(/["]+/g, '').split(path.delimiter).map(function (chunk) {
      return envExt.split(path.delimiter).map(function (ext) {
        return path.join(chunk, bin + ext)
      })
    }).reduce(function (a, b) {
      return a.concat(b)
    })
  }
  return getPaths(bin).some(fs.existsSync)
}
