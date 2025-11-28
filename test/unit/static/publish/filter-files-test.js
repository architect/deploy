const { test } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 'filter-files.js')
let sut = require(filePath)

test('Module is present', () => {
  assert.ok(sut, 'File filter module is present')
})

test('File filtering', async (t) => {
  await t.test('filters static.json from initial list', (t, done) => {
    let globbed = [
      'public/index.html',
      'public/static.json',
      'public/something.json',
    ]
    let ignore = []

    sut({ globbed, ignore }, (err, filtered) => {
      assert.ifError(err)
      assert.strictEqual(filtered.length, 2, 'Correct files ignored')
      assert.ok(!filtered.includes(globbed[1]), 'static.json ignored')
      done()
    })
  })

  await t.test('filters static.json and ignored files', (t, done) => {
    let globbed = [
      'public/index.html',
      'public/static.json',
      'public/something.json',
    ]
    let ignore = []
    let file = 'public/some-file.txt'
    globbed.push(file)
    ignore.push(file)

    sut({ globbed, ignore }, (err, filtered) => {
      assert.ifError(err)
      assert.ok(globbed.length === 4 && ignore.length === 1, 'New file was passed to files + ignore list')
      assert.strictEqual(filtered.length, 2, 'New file was ignored')
      assert.ok(!filtered.includes(globbed[1]), 'static.json ignored')
      done()
    })
  })
})
