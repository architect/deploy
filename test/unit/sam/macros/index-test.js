let test = require('tape')
let proxyquire = require('proxyquire').noCallThru()
let { join } = require('path')

function internalMacroPath (macro) {
  return join(__dirname, '..', '..', '..', '..', 'src', 'sam', 'macros', `_${macro}`, 'index.js')
}

let customMacroArgs = []
let legacyApiCalled = false
let oldCfnCalled = false
let httpVerCalled = false
let apiPathCalled = false
let arcEnvCalled = false
let staticCalled = false
let proxyCalled = false
let asapCalled = false
function reset () {
  customMacroArgs = []
  legacyApiCalled = false
  oldCfnCalled = false
  httpVerCalled = false
  apiPathCalled = false
  arcEnvCalled = false
  staticCalled = false
  proxyCalled = false
  asapCalled = false
}

let macroPath = join(process.cwd(), 'src', 'macros', 'myFakeMacro.js')
let macros = proxyquire('../../../../src/sam/macros', {
  'fs': { existsSync: (path) => {
    if ((path.includes('_') && !path.includes('myFakeMacro')) || path.includes('myFakeMacro.js')) return true // macro existence check fakeout
    return false
  } },
  [internalMacroPath('legacy-api')]: (arc, cfn) => { legacyApiCalled = true; return cfn },
  [internalMacroPath('old-cfn')]: (arc, cfn) => { oldCfnCalled = true; return cfn },
  [internalMacroPath('http-ver')]: (arc, cfn) => { httpVerCalled = true; return cfn },
  [internalMacroPath('api-path')]: (arc, cfn) => { apiPathCalled = true; return cfn },
  [internalMacroPath('arc-env')]: (arc, cfn) => { arcEnvCalled = true; return cfn },
  [internalMacroPath('static')]: (arc, cfn) => { staticCalled = true; return cfn },
  [internalMacroPath('proxy')]: (arc, cfn) => { proxyCalled = true; return cfn },
  [internalMacroPath('asap')]: (arc, cfn) => { asapCalled = true; return cfn },
  [macroPath]: (arc, cfn, stage, inv) => {
    customMacroArgs = [ arc, cfn, stage, inv ]
    return cfn
  }
})


let inv = {
  inv: {
    _project: {
      arc: {
        macros: [ 'myFakeMacro' ]
      },
    }
  }
}

let fakeCfn = {
  Resources: []
}

test('built-in arc deploy macros should always be called', t => {
  reset()
  t.plan(9)
  let cfn = JSON.parse(JSON.stringify(fakeCfn))
  let inventory = JSON.parse(JSON.stringify(inv))
  macros(inventory, cfn, 'staging', (err, result) => {
    if (err) {
      console.error(err)
      t.fail(err)
    }
    else {
      t.ok(legacyApiCalled, 'legacy-api internal macro invoked')
      t.ok(oldCfnCalled, 'old-cfn internal macro invoked')
      t.ok(httpVerCalled, 'http-ver internal macro invoked')
      t.ok(apiPathCalled, 'api-path internal macro invoked')
      t.ok(arcEnvCalled, 'arc-env internal macro invoked')
      t.ok(staticCalled, 'static internal macro invoked')
      t.ok(proxyCalled, 'proxy internal macro invoked')
      t.ok(asapCalled, 'asap internal macro invoked')
      t.ok(result, 'result cfn received as output')
    }
  })
})

test('user macros should receive pristine parsed arc object', t => {
  reset()
  t.plan(1)
  let cfn = JSON.parse(JSON.stringify(fakeCfn))
  let inventory = JSON.parse(JSON.stringify(inv))
  macros(inventory, cfn, 'staging', (err) => {
    if (err) {
      console.error(err)
      t.fail(err)
    }
    else {
      t.deepEqual(customMacroArgs[0], inv.inv._project.arc, 'arc file passed into macro module same as that received by custom macro')
    }
  })
})
