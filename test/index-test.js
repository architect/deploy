let test = require('tape')
let index = require('../')
let macros = require('../src/sam/macros')

test('module should have three functions', t => {
  t.plan(3)
  t.equals(typeof index.sam, 'function', 'sam() is a function')
  t.equals(typeof index.dirty, 'function', 'dirty() is a function')
  t.equals(typeof index.static, 'function', 'static() is a function')
})

test('macros', t=> {
  t.plan(3)
  t.ok(macros, 'yep')
  let result = macros({macros:['fake-macro']}, {fake:true})
  t.ok(result.fake, 'fake')
  t.ok(result.hi, 'hi')
})
