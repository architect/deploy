let test = require('tape')
let awsLite = require('@aws-lite/client')
let { join } = require('path')
let mockTmp = require('mock-tmp')
let proxyquire = require('proxyquire')
let _inventory = require('@architect/inventory')
let { updater } = require('@architect/utils')

let inventory
let params
let putted
let deleted

function putFiles (params, callback) {
  putted = params
  callback(null, params.files.length, 0)
}
function deleteFiles (params, callback) {
  deleted = params
  callback()
}

let filePath = join(process.cwd(), 'src', 'static', 'publish', 'index.js')
let sut = proxyquire(filePath, {
  './s3/put-files': putFiles,
  './s3/delete-files': deleteFiles,
})

let aws
let defaultParams = () => ({
  aws,
  Bucket: 'a-bucket',
  folder: 'public',
  inventory,
  prune: false,
  region: 'us-west-1',
  update: updater('Deploy'),
})

let arc = '@app\nan-app\n@static'
let content = 'hi there'

function setup () {
  putted = undefined
  deleted = undefined
  params = defaultParams()
  awsLite.testing.mock('S3.HeadObject', '')
  awsLite.testing.mock('S3.PutObject', '')
  awsLite.testing.mock('S3.ListObjectsV2', '')
  awsLite.testing.mock('S3.DeleteObjects', '')
}

test('Set up env', async t => {
  t.plan(3)
  t.ok(sut, 'S3 publish module is present')

  aws = await awsLite({ region: 'us-west-2', plugins: [ import('@aws-lite/s3') ] })
  awsLite.testing.enable()
  t.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')

  let cwd = mockTmp({
    'app.arc': arc,
    public: {
      'index.html':     content,
      'something.json': content,
      'index.js':       content,
    },
  })
  inventory = await _inventory({ cwd })
  t.ok(inventory, 'Got inventory obj')
})

test('Static asset publishing', t => {
  t.plan(7)
  setup()
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(putted.files.length, 3, 'Passed files to be published')
    t.equal(putted.fingerprint, null, 'Passed fingerprint unmutated')
    t.ok(putted.publicDir, 'Passed publicDir')
    t.equal(putted.prefix, undefined, 'Passed prefix unmutated')
    t.equal(putted.region, params.region, 'Passed region unmutated')
    t.deepEqual(putted.staticManifest, {}, 'Passed empty staticManifest by default')
    t.notOk(deleted, 'No files pruned')
  })
})

test(`Static asset deletion (deployAction is 'all')`, t => {
  t.plan(7)
  setup()
  let params = defaultParams()
  params.prune = true
  params.deployAction = 'all'
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(deleted.Bucket, params.Bucket, 'Passed bucket unmutated')
    t.equal(deleted.files.length, 3, 'Passed files to be published')
    t.equal(deleted.fingerprint, null, 'Passed fingerprint unmutated')
    t.equal(deleted.folder, params.folder, 'Passed folder unmutated')
    t.equal(deleted.prefix, undefined, 'Passed prefix unmutated')
    t.equal(deleted.region, params.region, 'Passed region setting unmutated')
    t.deepEqual(deleted.staticManifest, {}, 'Passed empty staticManifest by default')
  })
})

test(`Static asset deletion (deployAction is 'delete')`, t => {
  t.plan(7)
  setup()
  let params = defaultParams()
  params.prune = true
  params.deployAction = 'delete'
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(deleted.Bucket, params.Bucket, 'Passed bucket unmutated')
    t.equal(deleted.files.length, 3, 'Passed files to be published')
    t.equal(deleted.fingerprint, null, 'Passed fingerprint unmutated')
    t.equal(deleted.folder, params.folder, 'Passed folder unmutated')
    t.equal(deleted.prefix, undefined, 'Passed prefix unmutated')
    t.equal(deleted.region, params.region, 'Passed region setting unmutated')
    t.deepEqual(deleted.staticManifest, {}, 'Passed empty staticManifest by default')
  })
})

test('Teardown', t => {
  t.plan(1)
  mockTmp.reset()
  awsLite.testing.disable()
  t.notOk(awsLite.testing.isEnabled(), 'Done')
})
