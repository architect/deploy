let reads = require('./reads')
let series = require('run-series')
let create = require('./cloudfront-create')
let enable = require('./cloudfront-enable')
let destroy = require('./cloudfront-destroy')

module.exports = function getAppApex(params, callback) {
  let {ts, arc, pretty, stackname, stage, update} = params
  reads({
    stackname,
    stage
  },
  function done(err, result) {
    if (err) {
      callback(err)
    }
    else {
      update.done('Deployed & built infrastructure')
      pretty.success(ts)
      let {url, wssURL, bucketDomain, apiDomain, s3, apigateway, httpDomain} = result
      let type = wssURL ? 'HTTP' : undefined
      if (arc.cdn && apigateway && apigateway.status !== 'InProgress') {
        pretty.url(`https://${apigateway.domain}`, type)
      }
      else if (arc.cdn && s3 && s3.status !== 'InProgress') {
        pretty.url(`https://${s3.domain}`, type)
      }
      else if (url) {
        pretty.url(url, type)
      }
      if (wssURL) {
        pretty.url(wssURL, 'WS')
      }
      if (httpDomain) {
        pretty.url(httpDomain)
      }
      // Added whitespace after URLs
      console.log()

      const cdn = arc.aws && arc.aws.find(tuple => tuple.includes('cdn'))
      if (cdn && cdn[1] === false) {
        return callback()
      }

      // create cdns if cdn is defined
      let creatingS3 = arc.static && arc.cdn && s3 === false
      let creatingApiGateway = arc.http && arc.cdn && apigateway === false

      // enabling (in the event someone destroyed and then changed their mind)
      let enablingS3 = arc.static && arc.cdn && s3.enabled === false
      let enablingApiGateway = arc.http && arc.cdn && apigateway.enabled === false

      // destroy (to the best of our ability) cdns if cdn is not defined
      let destroyingS3 = typeof arc.cdn === 'undefined' && s3
      let destroyingApiGateway = typeof arc.cdn === 'undefined' && apigateway

      series([
        function createS3(callback) {
          if (creatingS3) {
            create({
              domain: bucketDomain
              // FIXME: create requires 'path' param
            }, callback)
          }
          else {
            callback()
          }
        },
        function enableS3(callback) {
          if (enablingS3) enable(s3, callback)
          else callback()
        },
        function destroyS3(callback) {
          if (destroyingS3) destroy(s3, callback)
          else callback()
        },
        function createApiGateway(callback) {
          if (creatingApiGateway) {
            create({
              domain: apiDomain,
              path: `/${stage}`,
              stage
            }, callback)
          }
          else {
            callback()
          }
        },
        function enableApiGateway(callback) {
          if (enablingApiGateway) enable(apigateway, callback)
          else callback()
        },
        function destroyApiGateway(callback) {
          if (destroyingApiGateway) destroy(apigateway, callback)
          else callback()
        }
      ],
      function done(err) {
        if (err) callback(err)
        else callback()
      })

    }
  })
}
