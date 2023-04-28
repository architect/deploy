#!/usr/bin/env node
let deploy = require('../../')
let _inventory = require('@architect/inventory')
let { banner, updater } = require('@architect/utils')
let validate = require('./validate')
let _flags = require('./flags')
let { version } = require('../../package.json')
let pauser = require('../utils/pause-sandbox')
let update = updater('Deploy')

/**
 * `arc deploy`
 *
 * deploys the current arcfile
 *
 * options
 * -p|--production|production ... deploys to AppNameProduction
 * -d|--direct|direct ........... direct deploy a specific function code/config
 * -s|--static|static ........... direct deploys /public to static s3 bucket
 * -v|--verbose|verbose ......... prints all output to console
 * -t|--tags|tags ............... add tags
 * -n|--name|name ............... customize stack name
 * --prune ...................... remove files that exist in static s3 bucket but do not exist in local /public folder
 * --dry-run .................... assemble CloudFormation sam.json but do not deploy remotely (useful for testing)
 */
async function main (/* opts = {} */) {
  let flags = _flags()

  if (flags.help) {
    helpMessage()
    return
  }

  if (flags.unknownArgs.length > 0) {
    unknownArgMessage(flags)
    return
  }

  if (flags.unknownFlags.length > 0) {
    unknownFlagMessage(flags)
    return
  }

  let { deployStage } = flags
  // Ignore Inventory if passed, and re-Inventory with deployStage set
  let inventory = await _inventory({ deployStage, env: true })

  // Validate for expected env and args and check for potential creds issues
  validate()

  // Populate options, read args into `prune`, `verbose`, `production`, `tags`, `name`, etc.
  let options = {
    inventory,
    update,
    region: inventory.inv.aws.region,
    ...flags,
  }

  // Pause the Sandbox watcher
  pauser.pause()

  if (options.isDirect || options.srcDirs.length) {
    let result = await deploy.direct(options)
    pauser.unpause()
    return result
  }

  if (options.isStatic) {
    let result = await deploy.static(options)
    pauser.unpause()
    return result
  }

  // Deploy with SAM by default..
  let result = await deploy.sam(options)
  pauser.unpause()
  return result
}

module.exports = main

// Allow direct invoke
if (require.main === module) {
  (async function () {
    try {
      let flags = _flags()

      if (flags.help) {
        helpMessage()
        return
      }

      if (flags.unknownArgs.length > 0) {
        unknownArgMessage(flags)
        return
      }

      if (flags.unknownFlags.length > 0) {
        unknownFlagMessage(flags)
        return
      }

      let inventory = await _inventory({})
      banner({ inventory, version: `Deploy ${version}` })
      await main({ inventory })
    }
    catch (err) {
      // Unpause the Sandbox watcher
      pauser.unpause()
      update.error(err)
      process.exit(1)
    }
  })()
}

function helpMessage () {
  let output = `Deploy an Architect project to AWS.

For more information, see the documentation:
<https://arc.codes/docs/en/reference/cli/deploy>

\x1b[1mUSAGE\x1b[0m
  arc deploy [flags]

\x1b[1mFLAGS\x1b[0m
  -d, --direct path/to/function   Directly deploy a specific function, code, or config
      --dry-run                   Create a CloudFormation template but do not deploy it (useful for testing)
  -n, --name string               Deploy a custom named stack
      --no-hydrate                Do not automatically run npm, bundle or pip before deploying
  -p, --production                Deploy a CloudFormation stack to a production stack
      --prune                     Remove assets that exist in the static S3 bucket but do not exist in the local /public folder
  -s, --static                    Deploy only the files in the static folder
  -t, --tag key=value             Add a resource tag to the CloudFormation stack
  -v, --verbose                   Display the full deploy status messages

\x1b[1mEXAMPLES\x1b[0m
  Deploy a staging stack
  $ arc deploy

  Deploy a production stack
  $ arc deploy --production

  Deploy a custom named stack
  $ arc deploy --name mycustomstackname

  Deploy a stack with resource tags
  $ arc deploy --tag tagA=foo --tag tagB=bar --tag tagC=baz

  Deploy static assets to S3
  $ arc deploy --static

  Deploy a specific function, code, or config
  $ arc deploy --direct src/http/get-index

  Run deploy without deploying
  $ arc deploy --dry-run
`

  console.log(output)
}

function unknownFlagMessage (flags) {
  let unknownFlag = flags.unknownFlags[0]

  let prefix
  if (unknownFlag.length > 1) {
    prefix = '--'
  }
  else {
    prefix = '-'
  }

  let output = `unknown flag: ${prefix}${unknownFlag}

try 'arc deploy --help' for more information
`

  console.log(output)
}

function unknownArgMessage (flags) {
  let unknownArg = flags.unknownArgs[0]

  let output = `unknown argument: ${unknownArg}

try 'arc deploy --help' for more information
`

  console.log(output)
}

