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

// Mock the SAM module directly to prevent sam.json file creation
let mockSam = proxyquire('../../src/sam', {
  './00-before': (params, callback) => {
    // Skip file writing, just call callback with dry-run result
    callback(null, 'dry-run')
  },
})

let deploy = proxyquire('../../', {
  '@aws-lite/client': mockAwsLite,
  './src/sam': mockSam,
})

test('deploy.sam credentials accepted', async t => {
  t.plan(3)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@static',
    deployStage: 'staging',
    shouldHydrate: false,
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

