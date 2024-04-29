let { statSync } = require('fs')
let minimist = require('minimist')

/**
 * Read CLI flags and populate userland options
 */
module.exports = function getFlags () {
  let alias = {
    debug:      [ 'd' ],
    direct:     [ 'dirty' ],
    fast:       [ 'f' ],
    name:       [ 'n' ],
    production: [ 'p' ],
    static:     [ 's' ],
    tag:        [ 'tags', 't' ],
    verbose:    [ 'v' ],
  }
  let boolean = [ 'direct', 'debug', 'dry-run', 'eject', 'fast', 'no-hydrate', 'production', 'static', 'verbose' ]
  let def = { hydrate: true }
  let args = minimist(process.argv.slice(2), { alias, boolean, default: def })
  if (args._[0] === 'deploy') args._.splice(0, 1)

  // Log levels
  let logLevel = 'normal'
  if (args.verbose) logLevel = 'verbose'
  if (args.debug) logLevel = 'debug'

  // TODO tidy up these properties
  return {
    debug:          logLevel === 'debug',
    deployStage:    args.production ? 'production' : 'staging',
    eject:          args.eject,
    fast:           args.fast,
    isDirect:       args.direct,
    isDryRun:       args['dry-run'] || args.eject,
    isStatic:       args.static,
    name:           args.name,
    production:     args.production,
    prune:          args.prune,
    shouldHydrate:  args.hydrate,
    srcDirs:        args.direct && getSrcDirs(args._),
    tags:           args.tag ? Array.isArray(args.tag) ? args.tag : [ args.tag ] : [],
    verbose:        logLevel === 'verbose' || logLevel === 'debug',
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
    catch { return acc }
  }, [])
}
