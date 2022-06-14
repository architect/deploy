let proxyquire = require('proxyquire')
let test = require('tape')
let { updater } = require('@architect/utils')
let inventory = require('@architect/inventory')
let { join } = require('path')
let mocks = { resources: [
  { ResourceType: 'AWS::Lambda::Function', LogicalResourceId: 'PostAccountsHTTPLambda' },
  { ResourceType: 'AWS::Lambda::Function', LogicalResourceId: 'GetIndexHTTPLambda' },
] }

// Necessary to run test solo
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')

function fakeGetResources (params, callback) {
  callback(null, mocks.resources)
}
let didHydrate
function fakeUpdateLambda (params, callback) {
  didHydrate = params.shouldHydrate
  callback(null)
}
let directDeployMod = proxyquire(join(process.cwd(), 'src', 'direct', 'deploy.js'), {
  '../utils/get-cfn-resources': fakeGetResources,
  './update': fakeUpdateLambda,
})
let defaultParams = () => ({
  production: false,
  region: 'us-west-1',
  stackname: undefined,
  shouldHydrate: true,
  ts: new Date(),
  update: updater('Deploy')
})
let params = defaultParams()
function reset () {
  params = defaultParams()
  didHydrate = null
}
function directDeploy (t, rawArc, lambdas, callback) {
  inventory({ rawArc }, function (err, result) {
    if (err) t.fail(err)
    else {
      params.inventory = result
      params.specificLambdasToDeploy = lambdas
      directDeployMod(params, err => {
        callback(err)
        reset()
      })
    }
  })
}

test('Set up env', t => {
  t.plan(1)
  t.ok(directDeployMod, 'Direct deployment module is present')

  awsMock.mock('CloudFormation', 'describeStacks', function (params, callback) {
    callback(null, { Stacks: false })
  })
  new aws.CloudFormation()
})

test('Should be able to deploy an HTTP POST function directly when a root handler function is defined', t => {
  t.plan(1)
  let rawArc = '@app\n an-app\n@http\npost /accounts\nget /'
  directDeploy(t, rawArc, [ 'src/http/post-accounts' ], err => {
    t.notOk(err, 'No direct deploy error')
  })
})

test('Should be able to deploy an HTTP function directly when @static present', t => {
  t.plan(1)
  let rawArc = '@app\n an-app\n@http\npost /accounts\n@static'
  directDeploy(t, rawArc, [ 'src/http/post-accounts' ], err => {
    t.notOk(err, 'No direct deploy error')
  })
})

test('Function "hydration" is optional', t => {
  let rawArc = '@app\n an-app\n@http\npost /accounts\nget /\n@static'

  t.test('Should hydrate by default', st => {
    st.plan(1)
    params.shouldHydrate = true
    directDeploy(t, rawArc, [ 'src/http/post-accounts' ], () => {
      st.ok(didHydrate, 'Did hydrate')
    })
  })

  t.test('Can be called with shouldHydrate: false', st => {
    st.plan(1)
    params.shouldHydrate = false
    directDeploy(t, rawArc, [ 'src/http/post-accounts' ], () => {
      st.notOk(didHydrate, 'Did not hydrate')
    })
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  t.pass('Done')
})
