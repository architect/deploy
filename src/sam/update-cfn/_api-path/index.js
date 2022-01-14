/**
 * Update API paths (and any callers to them) with stage-specific parts
 * TODO: we should make Inventory stage-aware, and move this logic into Package
 */
// eslint-disable-next-line
module.exports = async function apiPath (arc, cloudformation, stage) {
  let cfn = cloudformation

  // @ws path/stages
  if (arc.ws) {
    // Set correct WS API name
    let WSname =
      cfn.Resources &&
      cfn.Resources.WS &&
      cfn.Resources.WS.Properties &&
      cfn.Resources.WS.Properties.Name
    if (WSname) {
      cfn.Resources.WS.Properties.Name = `${WSname}${stage.charAt(0).toUpperCase() + stage.substr(1)}`
    }

    // Set correct stage in path
    let WSstageName =
      cfn.Resources &&
      cfn.Resources.WebsocketStage &&
      cfn.Resources.WebsocketStage.Properties &&
      cfn.Resources.WebsocketStage.Properties.StageName
    if (WSstageName) {
      cfn.Resources.WebsocketStage.Properties.StageName = stage
    }

    // Update env var stage
    Object.keys(cfn.Resources).forEach(r => {
      let resource = cfn.Resources[r]
      let ARC_WSS_URL =
        resource.Properties &&
        resource.Properties.Environment &&
        resource.Properties.Environment.Variables &&
        resource.Properties.Environment.Variables.ARC_WSS_URL &&
        resource.Properties.Environment.Variables.ARC_WSS_URL['Fn::Sub']
      let API = ARC_WSS_URL && ARC_WSS_URL.findIndex(i => typeof i === 'string' && i.startsWith('wss://') && i.includes('.execute-api.'))
      if (ARC_WSS_URL && ARC_WSS_URL[API]) {
        cfn.Resources[r].Properties.Environment.Variables.ARC_WSS_URL['Fn::Sub'][API] = ARC_WSS_URL[API].replace('staging', stage)
      }
    })

    // Set output
    let outputsAPI =
      cfn.Outputs &&
      cfn.Outputs.WSS &&
      cfn.Outputs.WSS.Value &&
      cfn.Outputs.WSS.Value['Fn::Sub']
    let API = outputsAPI && outputsAPI.findIndex(i => typeof i === 'string' && i.startsWith('wss://') && i.includes('.execute-api.'))
    if (outputsAPI && outputsAPI[API]) {
      cfn.Outputs.WSS.Value['Fn::Sub'][API] = outputsAPI[API].replace('staging', stage)
    }
  }

  return cfn
}
