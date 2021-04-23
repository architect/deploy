let test = require('tape')
let { join } = require('path')
let origDir = process.cwd()
let sam = require('../../src/sam')
let inventory = require('@architect/inventory')
let inv

test('end-to-end sam setup', t => {
  t.plan(3)
  process.chdir(join(__dirname, '..', 'mocks', 'app-with-extensions'))
  t.pass('chdir to mock app')
  inventory({}, (err, result) => {
    t.notOk(err, 'no error retrieving inventory from mock app')
    t.ok(result, 'got some manner of inventory')
    inv = result
  })
})

test('multiple macro and plugin cfn additions honoured', t => {
  t.plan(5)
  sam({ isDryRun: true, shouldHydrate: false, region: 'us-west-2', inventory: inv, verbose: true }, (err) => {
    t.notOk(err, 'no error from sam method')
    // eslint-disable-next-line global-require
    let json = require(join(process.cwd(), 'sam.json'))
    t.ok(json.macroOne, 'first macro cfn addition present')
    t.ok(json.macroTwo, 'second macro cfn addition present')
    t.ok(json.pluginOne, 'first plugin cfn addition present')
    t.ok(json.pluginTwo, 'second plugin cfn addition present')
  })
})

test('(hydrate=true) multiple macro and plugin cfn additions honoured', t => {
  t.plan(5)
  sam({ isDryRun: true, shouldHydrate: true, region: 'us-west-2', inventory: inv, verbose: true }, (err) => {
    t.notOk(err, 'no error from sam method')
    // eslint-disable-next-line global-require
    let json = require(join(process.cwd(), 'sam.json'))
    t.ok(json.macroOne, 'first macro cfn addition present')
    t.ok(json.macroTwo, 'second macro cfn addition present')
    t.ok(json.pluginOne, 'first plugin cfn addition present')
    t.ok(json.pluginTwo, 'second plugin cfn addition present')
  })
})

test('end-to-end sam teardown', t => {
  t.plan(1)
  process.chdir(origDir)
  t.pass('chdir to original')
})
