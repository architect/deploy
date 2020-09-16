#!/usr/bin/env node
let deploy = require('.')
let { banner, updater } = require('@architect/utils')
let create = require('@architect/create')
let validate = require('./src/validate')
let options = require('./src/options')
let { version } = require('./package.json')
let pauser = require('./src/utils/pause-sandbox')

/**
 * `arc deploy`
 *
 * deploys the current arcfile
 *
 * options
 * -p|--production|production ... deploys to AppNameProduction
 * -d|--dirty|dirty ............. *staging only* dirty deploy function code/config
 * -s|--static|static ........... dirty deploys /public to s3 bucket
 * -v|--verbose|verbose ......... prints all output to console
 * -t|--tags|tags ............... add tags
 * -n|--name|name ............... customize stack name
 */
async function cmd (opts = []) {

  // Validate for expected env and args and check for potential creds issues
  validate(opts)

  // Pause the Sandbox watcher
  pauser.pause()

  // create any missing local infra
  await create({})

  // read args into {prune, verbose, production, tags, name, isFullDeploy}
  let args = options(opts)

  if (args.isDirty || args.srcDirs.length) {
    let result = await deploy.dirty(args)
    pauser.unpause()
    return result
  }

  if (args.isStatic) {
    let result = await deploy.static(args)
    pauser.unpause()
    return result
  }

  // deploy with SAM by default..
  let result = await deploy.sam(args)
  pauser.unpause()
  return result
}

module.exports = cmd

// Allow direct invoke
if (require.main === module) {
  let args = options(process.argv)
  ;(async function () {
    try {
      banner({ version: `Deploy ${version}` })
      await cmd(process.argv)
    }
    catch (err) {
      // Unpause the Sandbox watcher
      pauser.unpause()
      let update = updater('Deploy')
      update.error(err)
      if (args.verbose)
        console.log(err)
    }
  })()
}
