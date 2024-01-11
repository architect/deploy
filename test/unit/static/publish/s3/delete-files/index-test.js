/* let test = require('tape')
let { join, sep } = require('path')
require('aws-sdk/lib/maintenance_mode_message').suppress = true
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')

let listObjCalls = []
let delObjCalls = []
let filesOnS3 = { Contents: [] }

let cwd = process.cwd()
let files = [
  'index.html',
  'folder/something.json',
  'index.js',
]
let localFiles = arr => arr.map(f => join(cwd, 'public', f.replace('/', sep)))
let noop = () => {}
let defaultParams = () => {
  let s3 = new aws.S3()
  return {
    Bucket: 'a-bucket',
    files: localFiles(files),
    fingerprint: false,
    folder: 'public',
    ignore: [],
    inventory: { inv: { _project: { cwd } } },
    prefix: undefined,
    region: 'us-west-1',
    s3,
    staticManifest: {},
    update: { status: noop, raw: noop },
  }
}

let filePath = join(cwd, 'src', 'static', 'publish', 's3', 'delete-files')
let sut = require(filePath)

function reset () {
  listObjCalls = []
  delObjCalls = []
  filesOnS3 = { Contents: [] }
}

test('Set up env', t => {
  t.plan(1)
  t.ok(sut, 'S3 file delete module is present')
  awsMock.mock('S3', 'listObjectsV2', (params, callback) => {
    listObjCalls.push(params)
    callback(null, filesOnS3)
  })
  awsMock.mock('S3', 'deleteObjects', (params, callback) => {
    delObjCalls.push(params)
    callback(null, { Deleted: params.Delete.Objects })
  })
})

test('Do not prune if there is nothing to prune', t => {
  t.plan(2)

  let params = defaultParams()
  filesOnS3 = { Contents: files.map(Key => ({ Key })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 0, 'S3.deleteObjects not called')
    reset()
  })
})

test('Prune if there is something to prune', t => {
  t.plan(3)

  let params = defaultParams()
  params.files.pop() // Create a pruning opportunity
  filesOnS3 = { Contents: files.map(Key => ({ Key })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, files[files.length - 1], `Pruned correct file: ${files[files.length - 1]}`)
    reset()
  })
})

test('Prune respects ignore', t => {
  t.plan(2)

  let params = defaultParams()
  params.files.pop() // Create a pruning opportunity
  filesOnS3 = { Contents: files.map(Key => ({ Key })) }
  params.ignore = [ 'index.js' ]
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 0, 'S3.deleteObjects not called')
    reset()
  })
})

test('Prune does not prefix if prefix is not set', t => {
  t.plan(2)

  let params = defaultParams()
  params.files.pop() // Create a pruning opportunity
  filesOnS3 = { Contents: files.map(Key => ({ Key })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.notOk(listObjCalls[0].Prefix, 'S3.listObjectsV2 not called with prefix')
    reset()
  })
})

test('Prune respects prefix setting', t => {
  t.plan(4)

  let params = defaultParams()
  let prefix = 'a-prefix'
  params.prefix = prefix
  params.files.pop() // Create a pruning opportunity
  filesOnS3 = { Contents: files.map(Key => ({ Key: `${prefix}/${Key}` })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.ok(listObjCalls[0].Prefix, 'S3.listObjectsV2 called with prefix')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    let file = `${prefix}/${files[files.length - 1]}`
    t.equal(delObjCalls[0].Delete.Objects[0].Key, file, `Pruned correct file: ${file}`)
    reset()
  })
})

test('Prune respects fingerprint setting', t => {
  t.plan(3)

  let params = defaultParams()
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-df330f3f12.html',
    'folder/something.json': 'folder/something-df330f3f12.json'
  }
  params.files.pop() // Create a pruning opportunity
  let pruneThis = 'index-df330f3f12.js'
  filesOnS3 = { Contents: [
    { Key: 'index-df330f3f12.html' },
    { Key: 'folder/something-df330f3f12.json' },
    { Key: pruneThis }
  ] }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, pruneThis, `Pruned correct file: ${pruneThis}`)
    reset()
  })
})

test('Prune respects both prefix & fingerprint settings together', t => {
  t.plan(3)

  let params = defaultParams()
  let prefix = 'a-prefix'
  params.prefix = prefix
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-df330f3f12.html',
    'folder/something.json': 'folder/something-df330f3f12.json'
  }
  params.files.pop() // Create a pruning opportunity
  let pruneThis = `${prefix}/index-df330f3f12.js`
  filesOnS3 = { Contents: [
    { Key: `${prefix}/index-df330f3f12.html`, },
    { Key: `${prefix}/folder/something-df330f3f12.json` },
    { Key: pruneThis }
  ] }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, pruneThis, `Pruned correct file: ${pruneThis}`)
    reset()
  })
})

test('Prune respects both prefix & fingerprint settings together in nested folders', t => {
  t.plan(3)

  let params = defaultParams()
  let prefix = 'a-prefix'
  params.prefix = prefix
  params.files = [
    'index.html',
    'a-folder/something.json',
  ]
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-df330f3f12.html',
    'a-folder/something.json': 'a-folder/something-df330f3f12.json'
  }
  let pruneThis = `${prefix}/a-folder/index-df330f3f12.js`
  filesOnS3 = { Contents: [
    { Key: `${prefix}/index-df330f3f12.html`, },
    { Key: `${prefix}/a-folder/something-df330f3f12.json` },
    { Key: pruneThis }
  ] }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, pruneThis, `Pruned correct file: ${pruneThis}`)
    reset()
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  t.pass('Done')
})
 */
