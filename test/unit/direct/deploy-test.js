const proxyquire = require('proxyquire')
let test = require('tape')
let { updater } = require('@architect/utils')
let inventory = require('@architect/inventory')
const { join } = require('path')
let mocks = { resources: [] }

// Necessary to run test solo
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')

function fakeGetResources (params, callback) {
  callback(null, mocks.resources)
}
function fakeUpdateLambda (params, callback) {
  callback(null)
}
let directDeployMod = proxyquire(join(process.cwd(), 'src', 'direct', 'deploy.js'), {
  '../utils/get-cfn-resources': fakeGetResources,
  './update': fakeUpdateLambda
})
let defaultParams = () => ({
  production: false,
  ts: new Date(),
  region: 'us-west-1',
  stackname: undefined,
  update: updater('Deploy')
})
let params = defaultParams()
function reset () {
  params = defaultParams()
}
function directDeploy (t, rawArc, lambdas, callback) {
  inventory({ rawArc }, function (err, result) {
    if (err) t.fail(err)
    else {
      params.inventory = result
      params.specificLambdasToDeploy = lambdas
      directDeployMod(params, err => {
        reset() // Must be reset before any tape tests are resolved because mock-fs#201
        callback(err)
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
    t.notOk(err)
  })
})
test('Should be able to deploy an HTTP function directly when @static present', t => {
  t.plan(1)
  let rawArc = '@app\n an-app\n@http\npost /accounts\n@static'
  directDeploy(t, rawArc, [ 'src/http/post-accounts' ], err => {
    t.notOk(err)
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  t.pass('Done')
})
