#!/usr/bin/env node
let deploy = require('../../')
let _inventory = require('@architect/inventory')
let { banner, updater } = require('@architect/utils')
let _flags = require('./flags')
let { version } = require('../../package.json')
let pauser = require('../utils/pause-sandbox')
// Initialized later with quiet flag

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
 * -q|--quiet|quiet ............ suppresses most console output
 * -t|--tags|tags ............... add tags
 * -n|--name|name ............... customize stack name
 * --prune ...................... remove files that exist in static s3 bucket but do not exist in local /public folder
 * --dry-run .................... assemble CloudFormation sam.json but do not deploy remotely (useful for testing)
 */
async function main(opts = {}) {
  let flags = _flags()
  let { deployStage, quiet } = flags
  // Use provided inventory or create new one
  let inventory = opts.inventory || await _inventory({ deployStage, env: true })

  // Use provided updater or create new one
  let update = opts.update || updater('Deploy', { quiet })

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
    let update
    try {
      let flags = _flags()
      let inventory = await _inventory({})
      banner({ inventory, version: `Deploy ${version}` })
      // Create updater at this level so it's accessible in catch block
      update = updater('Deploy', { quiet: flags.quiet })
      await main({ inventory, update })
    }
    catch (err) {
      // Unpause the Sandbox watcher
      pauser.unpause()
      // Reuse the same updater instance to preserve any internal state
      if (update) {
        update.error(err)
      } else {
        // Fallback if updater wasn't created yet
        let flags = _flags()
        updater('Deploy', { quiet: flags.quiet }).error(err)
      }
      process.exit(1)
    }
  })()
}
