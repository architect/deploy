let test = require('tape')
let index = require('../../')

test('module should have three functions', t => {
  t.plan(3)
  t.equals(typeof index.sam, 'function', 'sam() is a function')
  t.equals(typeof index.dirty, 'function', 'dirty() is a function')
  t.equals(typeof index.static, 'function', 'static() is a function')
})
