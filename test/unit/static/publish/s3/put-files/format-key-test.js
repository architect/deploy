const { test } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')
const { globSync, statSync } = require('node:fs')
const inventory = require('@architect/inventory')
const { pathToUnix } = require('@architect/utils')

let sut = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'format-key.js')
let formatKey = require(sut)

let defaultParams = () => ({
  file: 'index.html',
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  staticManifest: {},
})

test('Module is present', () => {
  assert.ok(formatKey, 'Publish module is present')
})

test('Key pathing', () => {
  let params = defaultParams()
  params.file = 'public/index.html'
  let Key = formatKey(params)
  assert.strictEqual(Key, 'index.html', 'Removed static folder from file path')

  params = defaultParams()
  params.file = '/public/index.html'
  Key = formatKey(params)
  assert.strictEqual(Key, 'index.html', 'Removed leading slash from file path')
})

test('Key pathing is correct on each platform', async () => {
  let cwd = join(process.cwd(), 'test', 'mocks', 'app-with-extensions')
  let inv = await inventory({ cwd })
  let publicDir = join(cwd, inv.inv.static.folder)

  let path = pathToUnix(cwd) + `/${inv.inv.static.folder}/**/*`
  let allPaths = globSync(path)
  // Filter out directories to match nodir: true behavior
  let files = allPaths.filter(p => {
    try {
      return statSync(p).isFile()
    }
    catch {
      return false
    }
  })
  console.log(`Found these assets to derive keys for:`, files)

  files.forEach(file => {
    let key = formatKey({ file, publicDir })
    assert.ok(!key.includes(publicDir), `Key pathing strips public dir`)
    assert.strictEqual(key, pathToUnix(key), `Key is *nix formatted`)
    console.log(`Before: ${file}\nAfter: ${key}`)
  })
})

test('Fingerprint key', () => {
  let params = defaultParams()
  params.file = 'static.json'
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html',
  }
  let Key = formatKey(params)
  assert.strictEqual(Key, 'static.json', 'Did not fingerprint static.json')

  params = defaultParams()
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html',
  }
  Key = formatKey(params)
  assert.strictEqual(Key, 'index-a1b2c.html', 'Fingerprinted filename')
})

test('Prefix key', () => {
  let params = defaultParams()
  params.prefix = 'some-folder'
  let Key = formatKey(params)
  assert.strictEqual(Key, 'some-folder/index.html', 'Prepended prefix to filename')

  params = defaultParams()
  params.prefix = 'some-folder'
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html',
  }
  Key = formatKey(params)
  assert.strictEqual(Key, 'some-folder/index-a1b2c.html', `Prepended prefix to fingerprinted filename: ${Key}`)
})
