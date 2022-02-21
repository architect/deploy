/**
 * Arc 8.3 introduced changes to CloudFormation resource naming
 * - For clearer identification and to eliminate the possibility of name conflicts
 * - Various services' CFN impls had issues, so this corrects them for existing apps
 */
// eslint-disable-next-line
module.exports = async function oldResources (params, callback) {
  let { cloudformation: cfn, inventory, compat } = params
  let { inv } = inventory

  // API Gateway + CloudFormation bug
  // - Existing WS routes later renamed in cfn templates result in the following error:
  // - `Route with key {whatever} already exists for this API (Service: AmazonApiGatewayV2;  Status Code: 409; Error Code: ConflictException`
  if (inv.ws && compat.foundEarlierWS) {
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

  // Apparently SSM params cannot be reassigned to different resource names
  // Only @events param namespace changed in 8.3
  if (inv.events && compat.foundEarlierEvents) {
    Object.entries(cfn.Resources).forEach(([ resource, value ]) => {
      if (resource.endsWith('EventTopicParam') && value.Type === 'AWS::SSM::Parameter') {
        let oldSchool = `${resource.replace(/EventTopicParam$/, 'TopicParam')}`
        cfn.Resources[oldSchool] = value
        delete cfn.Resources[resource]
      }
    })
  }

  callback(null, cfn)
}
