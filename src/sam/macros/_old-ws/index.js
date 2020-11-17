/**
 * API Gateway + CloudFormation has a bug
 * - Existing WS routes later renamed in cfn templates result in the following error:
 * - `Route with key {whatever} already exists for this API (Service: AmazonApiGatewayV2; Status Code: 409; Error Code: ConflictException`
 * - So Arc 8.3+ corrects for this aberration
 */
// eslint-disable-next-line
module.exports = async function oldWS (arc, cfn, stage, inventory) {
  let { inv } = inventory
  if (inv.ws && inv._deploy.foundEarlierWS) {
    cfn.Resources.WebsocketDeployment.DependsOn = [
      'WebsocketConnectRoute',
      'WebsocketDefaultRoute',
      'WebsocketDisconnectRoute'
    ]
    Object.entries(cfn.Resources).forEach(([ resource, value ]) => {
      if (resource.endsWith('WSRoute')) {
        let oldSchool = `Websocket${resource.replace(/WSRoute$/, 'Route')}`
        value.Properties.OperationName = oldSchool
        cfn.Resources[oldSchool] = value
        delete cfn.Resources[resource]
      }
    })
  }
  return cfn
}
