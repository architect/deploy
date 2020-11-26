#!/usr/bin/env node
let deploy = require('../../')
let _inventory = require('@architect/inventory')
let { banner, updater } = require('@architect/utils')
let validate = require('./validate')
let _options = require('./options')
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
 * -d|--direct|direct ........... direct deploy function code/config
 * -s|--static|static ........... direct deploys /public to s3 bucket
 * -v|--verbose|verbose ......... prints all output to console
 * -t|--tags|tags ............... add tags
 * -n|--name|name ............... customize stack name
 */
async function cmd () {
  let inventory = await _inventory({ env: true })

  let opts = process.argv || []

  // Validate for expected env and args and check for potential creds issues
  validate()

  // Populate options, read args into `prune`, `verbose`, `production`, `tags`, `name`, `isFullDeploy`, etc.
  let options = {
    inventory,
    update,
    region: inventory.inv.aws.region,
    ..._options(opts)
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

module.exports = cmd

// Allow direct invoke
if (require.main === module) {
  (async function () {
    try {
      let inventory = await _inventory({})
      banner({ inventory, version: `Deploy ${version}` })
      await cmd()
    }
    catch (err) {
      // Unpause the Sandbox watcher
      pauser.unpause()
      update.error(err)
      process.exit(1)
    }
  })()
}
