let test = require('tape')
let { join } = require('path')
let mockTmp = require('mock-tmp')
let proxyquire = require('proxyquire')
let inventory = require('@architect/inventory')
let { updater } = require('@architect/utils')

// Necessary to run test solo
require('aws-sdk/lib/maintenance_mode_message').suppress = true
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')

let published
function publish (params, callback) {
  published = params
  callback(null, params)
}

let staticDeployPath = join(process.cwd(), 'src', 'static', 'index.js')
let staticDeployMod = proxyquire(staticDeployPath, {
  './publish': publish
})

let defaultParams = () => ({
  bucket: 'a-bucket',
  isDryRun: false,
  name: 'an-app',
  production: false,
  region: 'us-west-1',
  stackname: undefined,
  update: updater('Deploy'),
  verbose: undefined,
  // `@static` settings
  prefix: undefined,
  prune: false
})
let params = defaultParams()

function setup () {
  published = undefined
}
function reset () {
  params = defaultParams()
  mockTmp.reset()
}

function staticDeploy (t, cwd, callback) {
  inventory({ cwd }, function (err, result) {
    if (err) t.fail(err)
    else {
      params.inventory = result
      staticDeployMod(params, err => {
        reset()
        callback(err)
      })
    }
  })
}

/**
 * Notes:
 * - Unfortunately, proxyquire seems to have a nested file folder + `@global` bug, so we can't run this from index
 *   - Instead, we have to run inventory ourselves on each test, which kinda sucks
 * - Also, it'd be nice to test the CloudFormation stackname code path
 */

test('Set up env', t => {
  t.plan(1)
  t.ok(staticDeployMod, 'Static asset deployment module is present')
  new aws.S3()
})

test(`Skip static deploy if @static isn't defined`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app'
  let cwd = mockTmp({ 'app.arc': arc })
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.notOk(published, 'Publish not called')
  })
})

test(`Static deploy exits gracefully if @http is defined, but public/ folder is not present`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @http'
  let cwd = mockTmp({ 'app.arc': arc })
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.notOk(published, 'Publish not called')
  })
})

test(`Publish static deploy if @static is defined`, t => {
  t.plan(4)
  setup()
  let arc = '@app\n an-app\n @static'
  let cwd = mockTmp({
    'app.arc': arc,
    'public': {},
  })
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.equal(published.Bucket, params.bucket, 'Bucket is unchanged')
    t.equal(published.prefix, null, 'Prefix set to null by default')
    t.equal(published.prune, null, 'Prune set to null by default')
    t.equal(published.region, params.region, 'Region is unchaged')
  })
})

test(`Publish static deploy if @http is defined and public/ folder is present`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @http'
  let cwd = mockTmp({ 'app.arc': arc, 'public': {} })
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.ok(published, 'Publish was called')
  })
})

test(`Respect prune param`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static'
  let cwd = mockTmp({ 'app.arc': arc, 'public': {} })
  params.prune = true
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.ok(published.prune, 'Prune is unchaged')
  })
})

test(`Respect prune setting in project manifest`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static\n prune true'
  let cwd = mockTmp({ 'app.arc': arc, 'public': {} })
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.ok(published.prune, 'Prune is enabled')
  })
})

test(`Respect prefix param`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static'
  let cwd = mockTmp({ 'app.arc': arc, 'public': {} })
  params.prefix = 'some-prefix'
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.equal(published.prefix, 'some-prefix', 'Prefix is unchanged')
  })
})

test(`Respect prefix setting in project manifest`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static\n prefix some-prefix'
  let cwd = mockTmp({ 'app.arc': arc, 'public': {} })
  staticDeploy(t, cwd, err => {
    if (err) t.fail(err)
    t.equal(published.prefix, 'some-prefix', 'Got correct prefix setting')
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  reset()
  t.pass('Done')
})
