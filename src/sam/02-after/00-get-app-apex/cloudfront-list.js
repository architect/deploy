let aws = require('aws-sdk')

/**
 * list all cloudfront distributions in a region
 */
module.exports = function listCloudfrontDistributions (callback) {
  let cf = new aws.CloudFront
  let distros = []
  function list (params = {}) {
    cf.listDistributions(params, function done (err, res) {
      if (err) {
        callback(err)
      }
      else {
        let { DistributionList, NextMarker } = res
        distros = distros.concat(DistributionList.Items)
        if (NextMarker) {
          list({ Marker: NextMarker })
        }
        else {
          let fmt = distro => ({
            id: distro.Id,
            domain: distro.DomainName,
            status: distro.Status,
            origin: distro.Origins.Items[0].DomainName,
            enabled: distro.Enabled
          })
          callback(null, distros.map(fmt))
        }
      }
    })
  }
  list()
}
