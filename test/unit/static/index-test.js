let test = require('tape')
let sinon = require('sinon')
let proxyquire = require('proxyquire')
let parser = require('@architect/parser')
let aws = require('aws-sdk-mock')
let publishFake = sinon.fake.yields()
let existsFake = { existsSync: sinon.fake.yields }
let index = proxyquire('../../../src/static', {
  './publish-to-s3': publishFake,
  'fs': existsFake
})
let bucketName = 'somebucket'
let stackFake = sinon.fake.yields(null, {
  StackResourceSummaries: [{
    ResourceType: 'AWS::S3::Bucket', PhysicalResourceId: bucketName, LogicalResourceId: 'StaticBucket'
  }]
})
aws.mock('CloudFormation', 'listStackResources', stackFake);
let basicArc = {
  arc: {
    app: ['appname'],
    static: [['staging', bucketName]]
  }
}
let readFake = sinon.stub(parser, 'readArc').returns(basicArc)

test('static: proper bucket parameter name invoked', t => {
  t.plan(1)
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].Bucket, bucketName, 'publish was called with correct bucket name')
  })
})

test('static: folder is set to public by default', t => {
  t.plan(1)
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].folder, 'public', 'publish was called with folder set to public')
  })
})


test('static: folder can be specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', bucketName], ['folder', 'a-static-folder']]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].folder, 'a-static-folder', 'publish was called with fingerprint set to true')
  })
})

test('static: fingerprinting is disabled by default', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns(basicArc)
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
      static: [['staging', bucketName], ['fingerprint', 'on']]
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
      static: [['staging', bucketName], ['fingerprint', 'off']]
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
      static: [['staging', bucketName]]
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
      static: [['staging', bucketName], ['prune', true]]
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
      static: [['staging', bucketName], ['prune', false]]
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
      static: [['staging', bucketName], { ignore: { tar: false, zip: false } }]
    }
  })
  index({}, () => {
    t.deepEquals(publishFake.lastCall.args[0].ignore, ['tar', 'zip'], 'publish was called with correct ignore array')
  })
})

test('static: prefix is disabled by default', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', bucketName]]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].prefix, false, 'publish was called with prefix set to false')
  })
})

test('static: prefix is enabled if specified', t => {
  t.plan(1)
  let prefix = 'a-prefix/'
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', bucketName], ['prefix', prefix]]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].prefix, prefix, 'publish was called with prefix')
  })
})

test('static: prefix is disabled if specified', t => {
  t.plan(1)
  readFake.resetBehavior()
  readFake.returns({
    arc: {
      app: ['appname'],
      static: [['staging', bucketName], ['prefix', false]]
    }
  })
  index({}, () => {
    t.equals(publishFake.lastCall.args[0].prefix, false, 'publish was called with prefix set to false')
  })
})
