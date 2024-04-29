/**
 * list all cloudfront distributions in a region
 */
module.exports = function listCloudfrontDistributions (aws, callback) {
  aws.cloudfront.ListDistributions({ paginate: true })
    .then((result) => {
      const { DistributionList } = result
      let fmt = distro => ({
        id: distro.Id,
        domain: distro.DomainName,
        status: distro.Status,
        origin: distro.Origins.Items[0].DomainName,
        enabled: distro.Enabled,
      })
      callback(null, DistributionList.Items.map(fmt))
    })
    .catch(callback)
}
