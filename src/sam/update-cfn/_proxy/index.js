/**
 * Update proxy stage for production deploys
 */
// eslint-disable-next-line
module.exports = async function api (arc, cloudformation, stage, inventory) {
  let { inv } = inventory
  let cfn = cloudformation

  if (inv.proxy && stage === 'production') {
    cfn.Resources.HTTP.Properties.DefinitionBody
      .paths['/$default']['x-amazon-apigateway-any-method']['x-amazon-apigateway-integration']
      .uri = inv.proxy.production
  }

  return cfn
}
