let test = require('tape')
let { join } = require('path')
let proxyquire = require('proxyquire')
let inventory = require('@architect/inventory')
let { updater } = require('@architect/utils')
let mockFs = require('mock-fs')

// Necessary to run test solo
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
  isFullDeploy: true,
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
  mockFs.restore()
}

function staticDeploy (t, callback) {
  inventory({}, function (err, result) {
    if (err) t.fail(err)
    else {
      params.inventory = result
      staticDeployMod(params, err => {
        reset() // Must be reset before any tape tests are resolved because mock-fs#201
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
 *   - However, mock-fs doesn't play nicely with aws-sdk(-mock)
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
  mockFs({ 'app.arc': arc })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.notOk(published, 'Publish not called')
  })
})

test(`Static deploy exits gracefully if @http is defined, but public/ folder is not present`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @http'
  mockFs({ 'app.arc': arc })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.notOk(published, 'Publish not called')
  })
})

test(`Publish static deploy if @static is defined`, t => {
  t.plan(6)
  setup()
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.equal(published.Bucket, params.bucket, 'Bucket is unchanged')
    t.equal(published.folder, 'public', 'Folder set to public by default')
    t.equal(published.isFullDeploy, params.isFullDeploy, 'isFullDeploy is unchaged')
    t.equal(published.prefix, null, 'Prefix set to null by default')
    t.equal(published.prune, null, 'Prune set to null by default')
    t.equal(published.region, params.region, 'Region is unchaged')
  })
})

test(`Publish static deploy if @http is defined and public/ folder is present`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @http'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.ok(published, 'Publish was called')
  })
})

test(`Respect prune param`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  params.prune = true
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.ok(published.prune, 'Prune is unchaged')
  })
})

test(`Respect prune setting in project manifest`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static\n prune true'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.ok(published.prune, 'Prune is enabled')
  })
})

test(`Respect folder setting in project manifest`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static\n folder some-folder'
  mockFs({
    'app.arc': arc,
    'some-folder': {}
  })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.equal(published.folder, 'some-folder', 'Got correct folder setting')
  })
})

test(`Respect prefix param`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  params.prefix = 'some-prefix'
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.equal(published.prefix, 'some-prefix', 'Prefix is unchanged')
  })
})

test(`Respect prefix setting in project manifest`, t => {
  t.plan(1)
  setup()
  let arc = '@app\n an-app\n @static\n prefix some-prefix'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  staticDeploy(t, err => {
    if (err) t.fail(err)
    t.equal(published.prefix, 'some-prefix', 'Got correct prefix setting')
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  t.pass('Done')
})
