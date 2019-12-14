let isDirty = opt=> opt === 'dirty' || opt === '--dirty' || opt === '-d'
let isStatic = opt=> opt === 'static' || opt === '--static' || opt === '-s'
let isProd = opt=> opt === 'production' || opt === '--production' || opt === '-p'
let isPrune = opt=> opt === 'prune' || opt === '--prune'
let isVerbose = opt=> opt === 'verbose' || opt === '--verbose' || opt === '-v'

let tags = arg=> arg === '--tags' || arg === '-t' || arg === 'tags'
let name = arg=> arg === '--name' || arg === '-n' || arg === 'name' || arg.startsWith('--name=')

module.exports = function options(opts) {
  return {
    prune: opts.some(isPrune),
    verbose: opts.some(isVerbose),
    production: opts.some(isProd),
    tags: getTags(opts),
    name: getName(opts),
    isDirty: opts.some(isDirty),
    isStatic: opts.some(isStatic),
    isFullDeploy: opts.some(isStatic)? false : true
  }
}

function getTags(list) {
  let hasTags = process.argv.some(tags)
  if (!hasTags)
    return []
  let len = list.length
  let index = list.findIndex(tags) + 1
  let left = list.slice(index, len)
  return left.filter(arg=> /^[a-zA-Z0-9]+=[a-zA-Z0-9]+/.test(arg))
}

function getName(list) {
  let hasName = process.argv.some(name)
  if (!hasName)
    return false

  let len = list.length
  let index = list.findIndex(name)
  let left = list.slice(index, len)
  let operator = left.shift()

  if (operator.indexOf('=') === -1) {
    return left.shift()
  }
  else {
    return operator.split('=')[1]
  }
}
