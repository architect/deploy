const proxyquire = require('proxyquire')
let test = require('tape')
let { updater } = require('@architect/utils')
let inventory = require('@architect/inventory')
const { join } = require('path')
let mocks = { resources: [] }
let mockFs = require('mock-fs')

// Necessary to run test solo
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')
awsMock.mock('CloudFormation', 'describeStacks', function (params, callback) {
  callback(null, { Stacks: false })
})
new aws.CloudFormation()

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
  mockFs.restore()
}
function directDeploy (t, lambdas, callback) {
  inventory({}, function (err, result) {
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

test('Module is present', t => {
  t.plan(1)
  t.ok(directDeployMod, 'Direct deployment module is present')
})

test('Should be able to deploy an HTTP POST function directly when a root handler function is defined', t => {
  t.plan(1)
  let arc = '@app\n an-app\n@http\npost /accounts\nget /'
  mockFs({ 'app.arc': arc })
  directDeploy(t, [ 'src/http/post-accounts' ], err => {
    t.notOk(err)
  })
})
test('Should be able to deploy an HTTP function directly when @static present', t => {
  t.plan(1)
  let arc = '@app\n an-app\n@http\npost /accounts\n@static'
  mockFs({ 'app.arc': arc })
  directDeploy(t, [ 'src/http/post-accounts' ], err => {
    t.notOk(err)
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  mockFs.restore()
  t.pass('Done')
})
