let test = require('tape')
let proxyquire = require('proxyquire')
let inventory = require('@architect/inventory')

let awsLiteArgs = []
let mockAwsLite = (args) => {
  awsLiteArgs.push(args)
  return Promise.resolve({
    cloudformation: {
      DescribeStacks: () => Promise.reject({ message: 'Stack does not exist', statusCode: 400 }),
      DescribeStackResources: () => Promise.resolve({ StackResources: [] }),
    },
  })
}

let deploy = proxyquire('../../', {
  '@aws-lite/client': mockAwsLite,
})

test('deploy.sam credentials accepted', async t => {
  t.plan(3)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@static',
    deployStage: 'staging',
  })
  await deploy.sam({
    credentials: {
      accessKeyId: 'ASIATEST123456789',
      secretAccessKey: 'testSecretKey123456789',
      sessionToken: 'testSessionToken123456789',
    },
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false, // Skip hydration to avoid inventory structure issues
  })
  t.ok(awsLiteArgs[0].accessKeyId, 'accessKeyId is present')
  t.ok(awsLiteArgs[0].secretAccessKey, 'secretAccessKey is present')
  t.ok(awsLiteArgs[0].sessionToken, 'sessionToken is present')

})

