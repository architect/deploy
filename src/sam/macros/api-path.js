/**
 * Update API paths (and any callers to them) with stage-specific parts
 */
module.exports = async function api(arc, cloudformation, stage) {
  stage = defaultStage(stage)
  let cfn = cloudformation

  // @http path/stages
  if (arc.http) {
    let outputsAPI =
      cfn.Outputs &&
      cfn.Outputs.API &&
      cfn.Outputs.API.Value &&
      cfn.Outputs.API.Value['Fn::Sub']
    let API = outputsAPI.findIndex(i => i.startsWith('https://') && i.includes('.execute-api.'))
    // update if it exists (and do not throw if it does not!)
    if (outputsAPI[API]) {
      outputsAPI[API] = outputsAPI[API].replace('staging', stage)
    }
  }

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
