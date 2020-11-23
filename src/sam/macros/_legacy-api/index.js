let { getLambdaName, toLogicalID } = require('@architect/utils')

let getApiProps = require('./get-api-properties')
let unexpress = require('./un-express-route')

let forceStatic = require('./add-static-proxy')

// eslint-disable-next-line
module.exports = async function legacyAPI (arc, cloudformation, stage, inventory) {
  let { apiType } = inventory.inv._deploy
  if (apiType === 'rest' && arc.http.length) {
    // Copy arc.http to avoid get index mutation
    let http = JSON.parse(JSON.stringify(arc.http))

    // Force add GetIndex if not defined
    let findGetIndex = tuple => tuple[0].toLowerCase() === 'get' && tuple[1] === '/'
    let hasGetIndex = http.some(findGetIndex) // we reuse this below for default proxy code
    if (!hasGetIndex) {
      http.push([ 'get', '/' ])
    }

    // Base props
    let Type = 'AWS::Serverless::Api'
    let Properties = getApiProps(http, stage)
    let appname = toLogicalID(arc.app[0])

    // Ensure standard CF sections exist
    if (!cloudformation.Resources) cloudformation.Resources = {}
    if (!cloudformation.Outputs) cloudformation.Outputs = {}

    // Be sure to destroy the REST api
    delete cloudformation.Resources.HTTP

    // Construct the API resource
    cloudformation.Resources[appname] = { Type, Properties }

    // By this point, Package already populated all Lambdas (and their config) for handling API endpoints
    // However, we do still need to update event references to the calling API
    http.forEach(route => {

      let method = route[0].toLowerCase() // get, post, put, delete, patch
      let path = unexpress(route[1]) // from /foo/:bar to /foo/{bar}
      let name = toLogicalID(`${method}${getLambdaName(route[1]).replace(/000/g, '')}`) // GetIndex

      // We don't support any + catchall in older REST APIs
      if (method === 'any') {
        throw ReferenceError(`'any' method not supported by Architect in legacy REST APIs: ${method} ${path}`)
      }
      if (path.endsWith('/*')) {
        throw ReferenceError(`Catchall syntax ('/*') not supported by Architect in legacy REST APIs: ${method} ${path}`)
      }

      // Normalize resource naming from pre 8.3 to minimize potential impact
      let routeLambdaOld = name
      let routeLambdaNew = `${name}HTTPLambda`
      let routeEventOld = `${name}Event`
      let routeEventNew = `${name}HTTPEvent`

      // Reconstruct the event source so SAM can wire the permissions
      cloudformation.Resources[routeLambdaOld] = cloudformation.Resources[routeLambdaNew]
      cloudformation.Resources[routeLambdaOld].Properties.Events[routeEventOld] = {
        Type: 'Api',
        Properties: {
          Path: path,
          Method: route[0].toUpperCase(),
          RestApiId: { Ref: appname }
        }
      }
      delete cloudformation.Resources[routeLambdaNew]
      delete cloudformation.Resources[routeLambdaOld].Properties.Events[routeEventNew]
    })

    // Add permissions for proxy+ resource aiming at GetIndex
    cloudformation.Resources.InvokeProxyPermission = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: { Ref: 'GetIndex' },
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: {
          'Fn::Sub': [
            'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*',
            { ApiId: { Ref: appname } }
          ]
        }
      }
    }

    // Add the deployment url to the output
    cloudformation.Outputs.API = {
      Description: 'API Gateway (REST)',
      Value: {
        'Fn::Sub': [
          'https://${ApiId}.execute-api.${AWS::Region}.amazonaws.com/' + stage,
          { ApiId: { Ref: appname } }
        ]
      }
    }

    cloudformation.Outputs.ApiId = {
      Description: 'API ID (ApiId)',
      Value: { Ref: appname }
    }

    // Add _static for static asset loading
    cloudformation = forceStatic(arc, cloudformation)
  }
  return cloudformation
}
