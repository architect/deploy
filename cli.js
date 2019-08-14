#!/usr/bin/env node
let deploy = require('.')
let utils = require('@architect/utils')
let validate = require('./src/validate')

/**
 * `arc deploy`
 *
 * deploys the current .arc as a sam application to AppNameStaging stack
 *
 * options
 * -p|--production|production ... deploys to AppNameProduction
 * -d|--dirty|dirty ............. *staging only* dirty deploy function code/config
 * -s|--static|static ........... dirty deploys /public to s3 bucket
 * -v|--verbose|verbose ......... prints all output to console
 */
let isDirty = opt=> opt === 'dirty' || opt === '--dirty' || opt === '-d'
let isStatic = opt=> opt === 'static' || opt === '--static' || opt === '-s'
let isProd = opt=> opt === 'production' || opt === '--production' || opt === '-p'
let isVerbose = opt=> opt === 'verbose' || opt === '--verbose' || opt === '-v'

async function cmd(opts=[]) {

  validate(opts)

  await utils.init()

  let args = { verbose: opts.some(isVerbose), production: opts.some(isProd) }

  if (opts.some(isDirty))
    return deploy.dirty()

  if (opts.some(isStatic))
    return deploy.static(args)

  return deploy.sam(args)
}

// export for architect/architect
module.exports = cmd

// allow direct invoke
if (require.main === module) {
  (async function() {
    try {
      await cmd(process.argv)
    }
    catch (err) {
      console.log(err)
    }
  })();
}
