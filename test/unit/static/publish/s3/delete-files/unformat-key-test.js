const { test } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'delete-files', 'unformat-key.js')
let sut = require(filePath)

test('Module is present', () => {
  assert.ok(sut, 'Unformat key module is present')
})

test('Strip prefix if present', () => {
  let file = 'index.html'
  let prefix = 'foo'
  let result = sut(`${prefix}/${file}`, prefix)
  assert.strictEqual(result, file, `Removed file prefix (${prefix}/) from key: ${file}`)
})

test('Force pruning if prefix is specified and root files are found', () => {
  let file = 'index.html'
  let prefix = 'foo'
  let result = sut(file, prefix)
  assert.strictEqual(result, `${file}-ARC_DELETE`, `Flagged file in root for deletion from prefixed assets`)
})

test('Unix normalize paths', () => {
  let file = 'a/file/in/nested/dirs/index.html'
  let normalized = `a/file/in/nested/dirs/index.html`
  let result = sut(file)
  assert.strictEqual(result, normalized, `Normalized path to platform: ${normalized}`)
})
