let test = require('tape')
let { join } = require('path')
let mockFs = require('mock-fs')
let proxyquire = require('proxyquire')
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')
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
  './s3/delete-files': deleteFiles
})

let s3
let defaultParams = () => ({
  Bucket: 'a-bucket',
  folder: 'public',
  inventory,
  isFullDeploy: true,
  prune: false,
  region: 'us-west-1',
  s3,
  update: updater('Deploy')
})

function reset () {
  mockFs.restore()
}

function setup () {
  let arc = '@app\nan-app\n@static'
  let html = 'public/index.html'
  let json = 'public/something.json'
  let file = 'public/index.js'
  let content = 'hi there'
  mockFs({
    'app.arc': arc,
    'public': {},
    [html]: Buffer.from(content),
    [json]: Buffer.from(content),
    [file]: Buffer.from(content),
  })
  putted = undefined
  deleted = undefined
  params = defaultParams()
}

test('Set up env', async t => {
  t.plan(2)
  setup()
  mockFs.restore()
  t.ok(sut, 'S3 publish module is present')
  inventory = await _inventory({})
  t.ok(inventory, 'Got inventory obj')

  awsMock.mock('S3', 'headObject', (params, callback) => {
    callback()
  })
  awsMock.mock('S3', 'putObject', (params, callback) => {
    callback()
  })
  awsMock.mock('S3', 'listObjectsV2', (params, callback) => {
    callback()
  })
  awsMock.mock('S3', 'deleteObjects', (params, callback) => {
    callback()
  })
  s3 = new aws.S3()
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
    reset()
  })
})

test('Static asset deletion', t => {
  t.plan(7)
  setup()
  let params = defaultParams()
  params.prune = true
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(deleted.Bucket, params.Bucket, 'Passed bucket unmutated')
    t.equal(deleted.files.length, 3, 'Passed files to be published')
    t.equal(deleted.fingerprint, null, 'Passed fingerprint unmutated')
    t.equal(deleted.folder, params.folder, 'Passed folder unmutated')
    t.equal(deleted.prefix, undefined, 'Passed prefix unmutated')
    t.equal(deleted.region, params.region, 'Passed region setting unmutated')
    t.deepEqual(deleted.staticManifest, {}, 'Passed empty staticManifest by default')
    reset()
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  t.pass('Done')
})
