let test = require('tape')
let { join, sep } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'delete-files', 'unformat-key.js')
let sut = require(filePath)

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'Unformat key module is present')
})

test('Strip prefix if present', t => {
  t.plan(1)
  let file = 'index.html'
  let prefix = 'foo'
  let result = sut(`${prefix}/${file}`, prefix)
  t.equal(result, file, `Removed file prefix (${prefix}/) from key: ${file}`)
})

test.only('Force pruning if prefix is specified and root files are found', t => {
  t.plan(1)
  let file = 'index.html'
  let prefix = 'foo'
  let result = sut(file, prefix)
  t.equal(result, `${file}-ARC_DELETE`, `Flagged file in root for deletion from prefixed assets`)
})

test('Platform normalize paths', t => {
  t.plan(1)
  let file = 'a/file/in/nested/dirs/index.html'
  let normalized = `a${sep}file${sep}in${sep}nested${sep}dirs${sep}index.html`
  let result = sut(file)
  t.equal(result, normalized, `Normalized path to platform: ${normalized}`)
})
