let { toLogicalID } = require('@architect/utils')

module.exports = function addStatic (arc, cloudformation) {

  let appname = toLogicalID(arc.app[0])

  cloudformation.Resources[appname].Properties.DefinitionBody.paths['/_static/{proxy+}'] = {
    get: {
      parameters: [ {
        name: 'proxy',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        }
      } ],
      'x-amazon-apigateway-integration': {
        uri: {
          'Fn::Sub': [
            'http://${bukkit}.s3.${AWS::Region}.amazonaws.com/{proxy}',
            { bukkit: { Ref: 'StaticBucket' } }
          ]
        },
        responses: {
          default: {
            statusCode: '200'
          }
        },
        requestParameters: {
          'integration.request.path.proxy': 'method.request.path.proxy'
        },
        passthroughBehavior: 'when_no_match',
        httpMethod: 'GET',
        cacheNamespace: 'xlr8r2',
        cacheKeyParameters: [
          'method.request.path.proxy'
        ],
        type: 'http_proxy'
      }
    }
  }
  return cloudformation
}
