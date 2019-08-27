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
    if (outputsAPI[API]) outputsAPI[API] = outputsAPI[API].replace('staging', stage)
    else throw Error('Ouputs HTTP API not found in CloudFormation template')
  }

  // @ws path/stages
  if (arc.ws) {
    let getStage = i => typeof i === 'object' && i.stage

    let WSstageName =
      cfn.Resources &&
      cfn.Resources.WebsocketStage &&
      cfn.Resources.WebsocketStage.Properties &&
      cfn.Resources.WebsocketStage.Properties.StageName
    if (WSstageName) WSstageName = stage
    else throw Error('WebSocket stage name not found in CloudFormation template')

    let WSparam =
      cfn.Resources &&
      cfn.Resources.WebsocketParam &&
      cfn.Resources.WebsocketParam.Properties &&
      cfn.Resources.WebsocketParam.Properties.Value &&
      cfn.Resources.WebsocketParam.Properties.Value['Fn::Sub']
    if (WSparam) WSparam[WSparam.findIndex(getStage)].stage = stage
    else throw Error('WebSocket param stage not found in CloudFormation template')

    let WSconnParam =
      cfn.Resources &&
      cfn.Resources.WebsocketConnectionParam &&
      cfn.Resources.WebsocketConnectionParam.Properties &&
      cfn.Resources.WebsocketConnectionParam.Properties.Value &&
      cfn.Resources.WebsocketConnectionParam.Properties.Value['Fn::Sub']
    if (WSconnParam) WSconnParam[WSconnParam.findIndex(getStage)].stage = stage
    else throw Error('WebSocket connection param stage not found in CloudFormation template')

    let outputsWS =
      cfn.Outputs &&
      cfn.Outputs.WSS &&
      cfn.Outputs.WSS.Value &&
      cfn.Outputs.WSS.Value['Fn::Sub']
    if (outputsWS) outputsWS[outputsWS.findIndex(getStage)].stage = stage
    else throw Error('Outputs WebSocket stage not found in CloudFormation template')
  }

  // TODO handle @cdn origin path here?

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
