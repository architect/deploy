let test = require('tape')
let { join } = require('path')
let proxyquire = require('proxyquire')
let { updater } = require('@architect/utils')
let mockFs = require('mock-fs')

let published
function publish (params, callback) {
  published = params
  callback(null, params)
}

let filePath = join(process.cwd(), 'src', 'static', 'index.js')
let sut = proxyquire(filePath, {
  './publish': publish,
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

function reset () {
  published = undefined
  mockFs.restore()
}

// Note: it'd be nice to test the CloudFormation stackname code path
// However, mock-fs doesn't play nicely with aws-sdk(-mock)

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'Publish module is present')
})

test(`Skip static deploy if @static isn't defined`, t => {
  t.plan(1)
  let arc = '@app\n an-app'
  mockFs({ 'app.arc': arc })
  sut(params, err => {
    if (err) t.fail(err)
    t.notOk(published, 'Publish not called')
    reset()
  })
})

test(`Skip static deploy if @http is defined, but public/ folder is not present`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @http'
  mockFs({ 'app.arc': arc })
  sut(params, err => {
    if (err) t.fail(err)
    t.notOk(published, 'Publish not called')
    reset()
  })
})

test(`Publish static deploy if @static is defined`, t => {
  t.plan(8)
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.Bucket, params.bucket, 'Bucket is unchanged')
    t.equal(published.fingerprint, false, 'Fingerprint set to false by default')
    t.equal(published.folder, 'public', 'Folder set to public by default')
    t.equal(published.ignore.length, 0, 'Ignore is empty by default')
    t.equal(published.isFullDeploy, params.isFullDeploy, 'isFullDeploy is unchaged')
    t.equal(published.prefix, false, 'Prefix set to false by default')
    t.equal(published.prune, params.prune, 'Prune is unchaged')
    t.equal(published.region, params.region, 'Region is unchaged')
    reset()
  })
})

test(`Publish static deploy if @http is defined and public/ folder is present`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @http'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.ok(published, 'Publish was called')
    reset()
  })
})

test(`Respect @static fingerprint true`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static\n fingerprint true'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.fingerprint, true, 'Fingerprint set to true')
    reset()
  })
})

test(`Respect @static fingerprint external`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static\n fingerprint external'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.fingerprint, 'external', 'Fingerprint set to external')
    reset()
  })
})

test(`Respect @static ignore`, t => {
  t.plan(2)
  let arc = `
@app
an-app
@static
ignore
  foo
  bar
`
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.ignore[0], 'foo', 'Got correct ignore config')
    t.equal(published.ignore[1], 'bar', 'Got correct ignore config')
    reset()
  })
})

test(`Respect prune param`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  let params = defaultParams()
  params.prune = true
  sut(params, err => {
    if (err) t.fail(err)
    t.ok(published.prune, 'Prune is unchaged')
    reset()
  })
})

test(`Respect prune setting in project manifest`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static\n prune true'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.ok(published.prune, 'Prune is enabled')
    reset()
  })
})

test(`Respect folder setting in project manifest`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static\n folder some-folder'
  mockFs({
    'app.arc': arc,
    'some-folder': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.folder, 'some-folder', 'Got correct folder setting')
    reset()
  })
})

test(`Error if static folder isn't present`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc
  })
  sut(params, err => {
    if (err) t.equal(err.message, '@static folder not found', 'Got error')
    reset()
  })
})

test(`Respect prefix param`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  let params = defaultParams()
  params.prefix = 'some-prefix'
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.prefix, 'some-prefix', 'Prefix is unchanged')
    reset()
  })
})

test(`Respect prefix setting in project manifest`, t => {
  t.plan(1)
  let arc = '@app\n an-app\n @static\n prefix some-prefix'
  mockFs({
    'app.arc': arc,
    'public': {}
  })
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(published.prefix, 'some-prefix', 'Got correct prefix setting')
    reset()
  })
})
