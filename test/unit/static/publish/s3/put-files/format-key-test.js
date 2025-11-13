let test = require('tape')
let { join } = require('path')
let inventory = require('@architect/inventory')
let { pathToUnix } = require('@architect/utils')
let { globSync } = require('@architect/utils/glob')

let sut = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'format-key.js')
let formatKey = require(sut)

let defaultParams = () => ({
  file: 'index.html',
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  staticManifest: {},
})

test('Module is present', t => {
  t.plan(1)
  t.ok(formatKey, 'Publish module is present')
})

test('Key pathing', t => {
  t.plan(2)

  let params = defaultParams()
  params.file = 'public/index.html'
  let Key = formatKey(params)
  t.equal(Key, 'index.html', 'Removed static folder from file path')

  params = defaultParams()
  params.file = '/public/index.html'
  Key = formatKey(params)
  t.equal(Key, 'index.html', 'Removed leading slash from file path')
})

test('Key pathing is correct on each platform', async t => {
  let cwd = join(process.cwd(), 'test', 'mocks', 'app-with-extensions')
  let inv = await inventory({ cwd })
  let publicDir = join(cwd, inv.inv.static.folder)

  let path = pathToUnix(cwd) + `/${inv.inv.static.folder}/**/*`
  let files = globSync(path, { dot: true, nodir: true, follow: true })
  console.log(`Found these assets to derive keys for:`, files)
  t.plan(files.length * 2)

  files.forEach(file => {
    let key = formatKey({ file, publicDir })
    t.notOk(key.includes(publicDir), `Key pathing strips public dir`)
    t.equal(key, pathToUnix(key), `Key is *nix formatted`)
    console.log(`Before: ${file}\nAfter: ${key}`)
  })
})

test('Fingerprint key', t => {
  t.plan(2)

  let params = defaultParams()
  params.file = 'static.json'
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html',
  }
  let Key = formatKey(params)
  t.equal(Key, 'static.json', 'Did not fingerprint static.json')

  params = defaultParams()
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html',
  }
  Key = formatKey(params)
  t.equal(Key, 'index-a1b2c.html', 'Fingerprinted filename')
})

test('Prefix key', t => {
  t.plan(2)

  let params = defaultParams()
  params.prefix = 'some-folder'
  let Key = formatKey(params)
  t.equal(Key, 'some-folder/index.html', 'Prepended prefix to filename')

  params = defaultParams()
  params.prefix = 'some-folder'
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html',
  }
  Key = formatKey(params)
  t.equal(Key, 'some-folder/index-a1b2c.html', `Prepended prefix to fingerprinted filename: ${Key}`)
})
