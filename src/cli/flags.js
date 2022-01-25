let { statSync } = require('fs')
let minimist = require('minimist')

/**
 * Read CLI flags and populate userland options
 */
module.exports = function getFlags () {
  let alias = {
    direct:     [ 'dirty' ],
    name:       [ 'n' ],
    production: [ 'p' ],
    static:     [ 's' ],
    tag:        [ 'tags', 't' ],
    debug:      [ 'd' ],
    verbose:    [ 'v' ],
  }
  let boolean = [ 'direct', 'debug', 'dry-run', 'eject', 'no-hydrate', 'production', 'static', 'verbose' ]
  let def = { hydrate: true }
  let args = minimist(process.argv.slice(2), { alias, boolean, default: def })
  if (args._[0] === 'deploy') args._.splice(0, 1)

  // Log levels
  let logLevel = 'normal'
  if (args.verbose) logLevel = 'verbose'
  if (args.debug) logLevel = 'debug'

  // TODO tidy up these properties
  return {
    prune:          args.prune,
    verbose:        logLevel === 'verbose',
    production:     args.production,
    deployStage:    args.production ? 'production' : 'staging',
    eject:          args.eject,
    tags:           args.tag ? Array.isArray(args.tag) ? args.tag : [ args.tag ] : [],
    name:           args.name,
    srcDirs:        args.direct && getSrcDirs(args._),
    isDirect:       args.direct,
    isDryRun:       args['dry-run'] || args.eject,
    isStatic:       args.static,
    isFullDeploy:   args.static ? false : true,
    shouldHydrate:  args.hydrate,
  }
}

function getSrcDirs (list) {
  return list.reduce((acc, f) => {
    try {
      let s = statSync(f)
      if (s.isDirectory()) {
        acc.push(f)
      }
      return acc
    }
    catch (e) { return acc }
  }, [])
}
