let { statSync } = require('fs')

let isDirect =  opt => opt === 'direct' || opt === '--direct' ||
                       opt === 'dirty' || opt === '--dirty' || opt === '-d'
let isDryRun =  opt => opt === '--dry-run'
let isProd =    opt => opt === 'production' || opt === '--production' || opt === '-p'
let isPrune =   opt => opt === 'prune' || opt === '--prune'
let isStatic =  opt => opt === 'static' || opt === '--static' || opt === '-s'
let isVerbose = opt => opt === 'verbose' || opt === '--verbose' || opt === '-v'

let tags =      arg => arg === '--tags' || arg === '-t' || arg === 'tags'
let apiType =   arg => arg.startsWith('--apigateway')
let name =      arg => arg === '--name' || arg === '-n' || arg === 'name' || arg.startsWith('--name=')

module.exports = function options (opts) {
  return {
    prune: opts.some(isPrune),
    verbose: opts.some(isVerbose),
    production: opts.some(isProd),
    tags: getTags(opts),
    apiType: getValue(opts, apiType),
    name: getValue(opts, name),
    srcDirs: getSrcDirs(opts),
    isDirect: opts.some(isDirect),
    isDryRun: opts.some(isDryRun),
    isStatic: opts.some(isStatic),
    isFullDeploy: opts.some(isStatic) ? false : true
  }
}

function getTags (list) {
  let hasTags = list.some(tags)
  if (!hasTags)
    return []
  let len = list.length
  let index = list.findIndex(tags) + 1
  let left = list.slice(index, len)
  return left.filter(arg => /^[a-zA-Z0-9]+=[a-zA-Z0-9]+/.test(arg))
}

function getValue (list, predicate) {
  let hasValue = list.some(predicate)
  if (!hasValue)
    return false

  let len = list.length
  let index = list.findIndex(predicate)
  let left = list.slice(index, len)
  let operator = left.shift()

  if (operator.indexOf('=') === -1) {
    return left.shift()
  }
  else {
    return operator.split('=')[1]
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
