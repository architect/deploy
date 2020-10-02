/**
 * Update proxy stage for production deploys
 */
// eslint-disable-next-line
module.exports = async function api (arc, cloudformation, stage) {

  if (arc.proxy && stage === 'production') {
    let production = arc.proxy.find(e => e[0] === 'production')
    // lol

    if (!production) {
      throw SyntaxError(`@proxy missing 'production' setting`)
    }

    cloudformation.Resources.HTTP.Properties.DefinitionBody
      .paths['/$default']['x-amazon-apigateway-any-method']['x-amazon-apigateway-integration']
      .uri = production[1]
  }

  return cloudformation
}
