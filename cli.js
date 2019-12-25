#!/usr/bin/env node
let deploy = require('.')
let {banner, updater} = require('@architect/utils')
let create = require('@architect/create')
let validate = require('./src/validate')
let options = require('./src/options')
let {version} = require('./package.json')

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
async function cmd(opts=[]) {

  // validate the call for expected env and args
  validate(opts)

  // create any missing local infra
  await create({})

  // read args into {prune, verbose, production, tags, name, isFullDeploy}
  let args = options(opts)

  if (args.isDirty)
    return deploy.dirty()

  if (args.isStatic)
    return deploy.static(args)

  // deploy with SAM by default..
  return deploy.sam(args)
}

module.exports = cmd

// Allow direct invoke
if (require.main === module) {
  (async function() {
    try {
      banner({version: `Deploy ${version}`})
      await cmd(process.argv)
    }
    catch (err) {
      let update = updater('Deploy')
      update.error(err)
    }
  })();
}
