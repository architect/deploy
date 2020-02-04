let {toLogicalID} = require('@architect/utils')

/**
 * Sets correct stage name
 */
module.exports = async function api(arc, cloudformation, stage) {
  stage = defaultStage(stage)
  let cfn = cloudformation
  let appname = toLogicalID(arc.app[0])

  let hasStageName =
    cfn.Resources[appname] &&
    cfn.Resources[appname].Properties &&
    cfn.Resources[appname].Properties.StageName
  if (hasStageName)
    cfn.Resources[appname].Properties.StageName = stage

  return cfn
}

// If it's not 'staging' or 'production', then it should be 'staging'
function defaultStage(stage) {
  let staging = 'staging'
  let production = 'production'
  if (stage !== staging && stage !== production)
    stage = staging
  return stage
}
