const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const inventory = require('@architect/inventory')

let awsLiteArgs = []
let deploy

const Module = require('module')
const originalRequire = Module.prototype.require

before(() => {
  // Override require to inject mocks
  Module.prototype.require = function (id) {
    // Mock @aws-lite/client
    if (id === '@aws-lite/client') {
      return function mockAwsLite (args) {
        awsLiteArgs.push(args)
        return Promise.resolve({
          cloudformation: {
            DescribeStacks: () => Promise.reject({ message: 'Stack does not exist', statusCode: 400 }),
            DescribeStackResources: () => Promise.resolve({ StackResources: [] }),
          },
        })
      }
    }
    // Mock sam/00-before to prevent file writing
    if (id === './00-before' && this.filename && this.filename.includes('sam')) {
      return function (params, callback) {
        callback(null, 'dry-run')
      }
    }
    return originalRequire.apply(this, arguments)
  }

  // Load deploy module with mocks in place
  deploy = require('../../')
})

test('deploy.sam credentials accepted', async () => {
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
    shouldHydrate: false,
  })
  assert.ok(awsLiteArgs[0].accessKeyId, 'accessKeyId is present')
  assert.ok(awsLiteArgs[0].secretAccessKey, 'secretAccessKey is present')
  assert.ok(awsLiteArgs[0].sessionToken, 'sessionToken is present')
})

