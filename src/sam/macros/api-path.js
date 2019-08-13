/**
 * Update API paths (and any callers to them) with stage-specific parts
 */
module.exports = async function api({arc, cfn, stage}) {
  stage = defaultStage(stage)

  // @http path/stages
  if (arc.http) {
    let APIs = cfn.Outputs.API.Value['Fn::Sub']
    let API = APIs.findIndex(i => i.startsWith('https://') && i.includes('.execute-api.'))
    APIs[API] = APIs[API].replace('staging', stage)
  }

  // @ws path/stages
  if (arc.ws) {
    let getStage = i => typeof i === 'object' && i.stage

    cfn.Resources.WebsocketStage.Properties.StageName = stage

    let WSparam =
      cfn.Resources.WebsocketParam.Properties.Value['Fn::Sub']
    WSparam[WSparam.findIndex(getStage)].stage = stage

    let WSconnParam =
      cfn.Resources.WebsocketConnectionParam.Properties.Value['Fn::Sub']
    WSconnParam[WSconnParam.findIndex(getStage)].stage = stage

    let outputsWS =
      cfn.Outputs.WSS.Value['Fn::Sub']
    outputsWS[outputsWS.findIndex(getStage)].stage = stage
  }

  // TODO handle @cdn origin path here

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
