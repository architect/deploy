let test = require('tape')
let sinon = require('sinon')
let proxyquire = require('proxyquire')
let utils = require('@architect/utils')
let aws = require('aws-sdk-mock')
let publishFake = sinon.fake.yields()
let index = proxyquire('../../../src/static', {
  './publish-to-s3': publishFake
})
let stackFake = sinon.fake.yields(null, {
  StackResourceSummaries: [{ResourceType: 'AWS::S3::Bucket', PhysicalResourceId: 'stagingbukt', LogicalResourceId: 'StaticBucket'}]
})
aws.mock('CloudFormation', 'listStackResources', stackFake);
let readFake = sinon.stub(utils, 'readArc').returns({
  arc: {
    app: ['appname'],
    static: [['staging', 'stagingbukt']]
  }
})

test('static: proper bucket parameter name invoked', t => {
  t.plan(1)
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].Bucket, 'stagingbukt', 'publish was called with correct bucket name')
  })
})

test('static: fingerprinting is disabled by default', t => {
  t.plan(1)
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].fingerprint, false, 'publish was called with fingerprint set to false')
  })
})

test('static: fingerprinting is enabled if specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', 'stagingbukt'], ['fingerprint', 'on']]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].fingerprint, true, 'publish was called with fingerprint set to true')
  })
})

test('static: fingerprinting is disabled if explicitly specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', 'stagingbukt'], ['fingerprint', 'off']]
    }
  })
  aws.mock('CloudFormation', 'listStackResources', stackFake);
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].fingerprint, false, 'publish was called with fingerprint set to false')
  })
})

test('static: pruning is disabled by default', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', 'stagingbukt']]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].prune, false, 'publish was called with prune set to false')
  })
})

test('static: pruning is enabled if specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', 'stagingbukt'], ['prune', true]]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].prune, true, 'publish was called with prune set to true')
  })
})

test('static: pruning is disabled if specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', 'stagingbukt'], ['prune', false]]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].prune, false, 'publish was called with prune set to false')
  })
})

test('static: ignore set is passed if specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', 'stagingbukt'], { ignore: { tar: false, zip: false } }]
    }
  })
  index({}, () => {
    t.deepEquals(publishFake.lastCall.args[0].ignore, ['tar', 'zip'], 'publish was called with correct ignore array')
  })
})
