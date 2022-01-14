// eslint-disable-next-line
module.exports = async function httpVersion (arc, cloudformation, stage, inventory) {
  let { apiType } = inventory.inv._deploy
  if (apiType === 'httpv1' && arc.http.length) {
    // Start here
    let paths = cloudformation.Resources.HTTP.Properties.DefinitionBody.paths

    // Now traverse the paths
    Object.entries(paths).forEach(([ path, params ]) => {
      // ... now traverse the methods within each path
      Object.entries(params).forEach(([ method, params ]) => {
        // ... now dip into the API Gateway integration
        if (params['x-amazon-apigateway-integration']) {
          // We don't necessarily know what kind of service integration this might be, best effort identify Lambdae
          let { payloadFormatVersion, type } = params['x-amazon-apigateway-integration']
          let lambda = payloadFormatVersion === '2.0' && type === 'aws_proxy'

          // ... now we can make an actual change
          if (lambda) {
            paths[path][method]['x-amazon-apigateway-integration'].payloadFormatVersion = '1.0'
          }
        }
      })
    })
  }

  return cloudformation
}
