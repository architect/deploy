let reads = require('./reads')
let series = require('run-series')
let create = require('./cloudfront-create')
let enable = require('./cloudfront-enable')
let destroy = require('./cloudfront-destroy')

module.exports = function getAppApex (params, callback) {
  let { aws, fast, inventory, pretty, stackname, stage, ts, update } = params
  let { inv } = inventory
  let arc = inv._project.arc // TODO cut this code path over to Inventory
  reads({
    aws,
    stackname,
    stage,
  },
  function done (err, result) {
    if (err) callback(err)
    else {
      if (!fast) {
        update.done('Deployed & built infrastructure')
      }
      pretty.success(ts)
      let { url, wssURL, bucketDomain, apiDomain, s3, apigateway, httpDomain } = result
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

      // Allow users to opt into or out of Architect's CDN
      // Assume the lack of presence of @cdn means we should ignore any related existing CF distros, as they may be managed outside Architect
      let cdnEnabled = arc.cdn?.[0] === true
      let cdnDisabled = arc.cdn?.[0] === false

      // create cdns if cdn is defined
      let creatingS3 = arc.static && cdnEnabled && s3 === false
      let creatingApiGateway = arc.http && cdnEnabled && apigateway === false

      // enabling (in the event someone destroyed and then changed their mind)
      let enablingS3 = arc.static && cdnEnabled && s3.enabled === false
      let enablingApiGateway = arc.http && cdnEnabled && apigateway.enabled === false

      // destroy (to the best of our ability) cdns if cdn is disabled, thus nominated for deletion
      let destroyingS3 = cdnDisabled && s3
      let destroyingApiGateway = cdnDisabled && apigateway

      series([
        function createS3 (callback) {
          if (creatingS3) {
            update.status('Creating static asset (S3) CDN distribution')
            create({
              aws,
              domain: bucketDomain,
              // When S3 buckets are configured as static sites, they are http/80
              // TODO To fix this, we may want conditional static site configuration when S3 isn't the only thing being shipped
              insecure: true,
              inventory,
            }, callback)
          }
          else callback()
        },
        function enableS3 (callback) {
          if (enablingS3) {
            update.status('Enabling static asset (S3) CDN distribution')
            enable(aws, s3, callback)
          }
          else callback()
        },
        function destroyS3 (callback) {
          if (destroyingS3) {
            update.status('Destroying static asset (S3) CDN distribution')
            destroy(aws, s3, callback)
          }
          else callback()
        },
        function invalidateS3 (callback) {
          if (cdnEnabled && s3 && !creatingS3 && !enablingS3 && !destroyingS3) {
            update.status('Invalidating static asset (S3) CDN distribution cache')
            aws.cloudfront.CreateInvalidation({
              Id: s3.id,
              InvalidationBatch: '/*',
              CallerReference: Date.now() + '',
            })
              .then(() => callback())
              .catch(callback)
          }
          else callback()
        },
        function createApiGateway (callback) {
          if (creatingS3 && creatingApiGateway) {
            update.status('Skipping creating API Gateway CDN distribution until static asset distribution creation has completed')
          }
          else if (creatingApiGateway) {
            update.status('Creating API Gateway CDN distribution')
            create({
              aws,
              domain: apiDomain,
              inventory,
              stage,
            }, callback)
          }
          else {
            callback()
          }
        },
        function enableApiGateway (callback) {
          if (enablingApiGateway) {
            update.status('Enabling API Gateway CDN distribution')
            enable(apigateway, callback)
          }
          else callback()
        },
        function destroyApiGateway (callback) {
          if (destroyingApiGateway) {
            update.status('Destroying API Gateway CDN distribution')
            destroy(aws, apigateway, callback)
          }
          else callback()
        },
        function invalidateApiGateway (callback) {
          if (cdnEnabled && apigateway && !creatingApiGateway && !enablingApiGateway && !destroyingApiGateway) {
            update.status('Invalidating API Gateway CDN distribution cache')
            aws.cloudfront.CreateInvalidation({
              Id: apigateway.id,
              InvalidationBatch: '/*',
              CallerReference: Date.now() + '',
            })
              .then(() => callback())
              .catch(callback)
          }
          else callback()
        },
      ],
      function done (err) {
        if (err) callback(err)
        else callback()
      })
    }
  })
}
