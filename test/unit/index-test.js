let test = require('tape')
let index = require('../../')

test('module should have three functions', t => {
  t.plan(3)
  t.equals(typeof index.sam, 'function', 'sam() is a function')
  t.equals(typeof index.direct, 'function', 'direct() is a function')
  t.equals(typeof index.static, 'function', 'static() is a function')
})
