const { test } = require('node:test')
const assert = require('node:assert/strict')
const index = require('../../')

test('module should have three functions', () => {
  assert.strictEqual(typeof index.sam, 'function', 'sam() is a function')
  assert.strictEqual(typeof index.direct, 'function', 'direct() is a function')
  assert.strictEqual(typeof index.static, 'function', 'static() is a function')
})
