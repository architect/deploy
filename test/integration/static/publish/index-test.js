let test = require('tape')
let { join } = require('path')
let { updater } = require('@architect/utils')
let proxyquire = require('proxyquire')
let mockFs = require('mock-fs')

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

let defaultParams = () => ({
  Bucket: 'a-bucket',
  fingerprint: false,
  folder: 'public',
  ignore: [],
  isFullDeploy: true,
  prune: false,
  region: 'us-west-1',
  update: updater('Deploy')
})
let params = defaultParams()

function reset () {
  putted = undefined
  deleted = undefined
  mockFs.restore()
}

test('Set up env', t => {
  t.plan(1)
  t.ok(sut, 'S3 publish module is present')
})

test('Static asset publishing', t => {
  t.plan(7)

  let html = 'public/index.html'
  let json = 'public/something.json'
  let file = 'public/index.js'
  let content = 'hi there'
  mockFs({
    [html]: Buffer.from(content),
    [json]: Buffer.from(content),
    [file]: Buffer.from(content),
  })

  // Publishing
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(putted.files.length, 3, 'Passed files to be published')
    t.equal(putted.fingerprint, params.fingerprint, 'Passed fingerprint unmutated')
    t.ok(putted.publicDir, 'Passed publicDir')
    t.equal(putted.prefix, undefined, 'Passed prefix unmutated')
    t.equal(putted.region, params.region, 'Passed region unmutated')
    t.deepEqual(putted.staticManifest, {}, 'Passed empty staticManifest by default')
    t.notOk(deleted, 'No files pruned')
    reset()
  })
})

test('Static asset publishing', t => {
  t.plan(7)

  let html = 'public/index.html'
  let json = 'public/something.json'
  let file = 'public/index.js'
  let content = 'hi there'
  mockFs({
    [html]: Buffer.from(content),
    [json]: Buffer.from(content),
    [file]: Buffer.from(content),
  })

  params.prune = true
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(deleted.Bucket, params.Bucket, 'Passed bucket unmutated')
    t.equal(deleted.files.length, 3, 'Passed files to be published')
    t.equal(deleted.fingerprint, params.fingerprint, 'Passed fingerprint unmutated')
    t.equal(deleted.folder, params.folder, 'Passed folder unmutated')
    t.equal(deleted.prefix, undefined, 'Passed prefix unmutated')
    t.equal(deleted.region, params.region, 'Passed region setting unmutated')
    t.deepEqual(deleted.staticManifest, {}, 'Passed empty staticManifest by default')
    reset()
  })
})
