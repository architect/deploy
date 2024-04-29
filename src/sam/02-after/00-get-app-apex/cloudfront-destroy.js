let waterfall = require('run-waterfall')

module.exports = function destroyCloudFrontDistribution (aws, { id: Id }, callback) {
  waterfall([
    function (callback) {
      aws.cloudfront.GetDistributionConfig({ Id })
        .then(result => callback(null, result))
        .catch(callback)
    },
    function (result, callback) {
      let ETag = result.ETag
      let DistributionConfig = result.DistributionConfig
      if (DistributionConfig.Enabled) {
        DistributionConfig.Enabled = false
        aws.cloudfront.UpdateDistribution({ Id, DistributionConfig, IfMatch: ETag })
          .then(result => callback(null, result))
          .catch(callback)
      }
      else {
        callback(null, { ETag })
      }
    },
    function ({ ETag }, callback) {
      aws.cloudfront.DeleteDistribution({ Id, IfMatch: ETag })
        .then(() => callback())
        .catch(callback)
    },
  ],
  function noop (err) {
    // If the CF distro isn't yet fully disabled, that's ok
    // We'll just let this operation run the next time a deploy happens, by which time we expect it should be disabled
    if (err && err.code != 'DistributionNotDisabled') console.log(err)
    callback()
  })
}
