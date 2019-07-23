let aws = require('aws-sdk')

module.exports = function createCloudFrontDistribution({domain, path}, callback) {
  let cf = new aws.CloudFront
  cf.createDistribution(config({
    DomainName: domain.replace('/production/', '').replace('https://', ''),
    OriginPath: path,
  }), callback)
}

function config({DomainName, OriginPath}) {

  let CallerReference = `edge-${Date.now()}`
  let OriginProtocolPolicy = OriginPath === '/production'? 'https-only' : 'http-only'

  let origin = {
    Id: CallerReference,
    DomainName,
    CustomHeaders: {Quantity: 0, Items: []},
    CustomOriginConfig: {
      HTTPPort: 80,
      HTTPSPort: 443,
      OriginProtocolPolicy,
      OriginSslProtocols: {
        Quantity: 3,
        Items: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
      },
      OriginReadTimeout: 30,
      OriginKeepaliveTimeout: 5, // NOTE FOR RYAN: up this for API edge config
    }
  }

  if (OriginPath === '/production')
    origin.OriginPath = OriginPath

  return {
    DistributionConfig: {

      CallerReference,
      Comment: `Created ${new Date(Date.now()).toISOString()}`,
      Enabled: true,
      IsIPV6Enabled: true,
      HttpVersion: 'http2',
      PriceClass: 'PriceClass_All',
      Aliases: {Quantity: 0, Items: []},
      CacheBehaviors: {Quantity: 0, Items: []},
      CustomErrorResponses: {Quantity: 0, Items: []},
      Origins: {Quantity: 1, Items: [origin]},

      DefaultCacheBehavior: {
        TargetOriginId: CallerReference,
        ForwardedValues: {
          QueryString: true,
          Cookies: {Forward: 'all'},
          Headers: {
            Quantity: 0,
            Items: [],
          },
          QueryStringCacheKeys: {
            Quantity: 0,
            Items: [],
          },
        },
        TrustedSigners: {
          Enabled: false,
          Quantity: 0,
          Items: [],
        },
        ViewerProtocolPolicy: 'redirect-to-https',
        MinTTL: 0,
        AllowedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'],
          CachedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
          },
        },
        SmoothStreaming: false,
        DefaultTTL: 86400,
        MaxTTL: 31536000,
        Compress: true, // Important!
        LambdaFunctionAssociations: {Quantity: 0, Items: []},
        FieldLevelEncryptionId: '',
      },

      ViewerCertificate: {
        CloudFrontDefaultCertificate: true,
        MinimumProtocolVersion: 'TLSv1.1_2016', // AWS recommended setting ¯\_(ツ)_/¯
      },

      Restrictions: {
        GeoRestriction: {
          RestrictionType: 'none',
          Quantity: 0,
          Items: [],
        },
      },
    }
  }
}
