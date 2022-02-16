let test = require('tape')
let proxyquire = require('proxyquire')
let baseCfn = { Resources: {} }
// let finalCfn
let _deploy = {}
let sam = proxyquire('../../../src/sam', {
  '../utils/handler-check': (dirs, update, cb) => cb(),
  './bucket': (params, cb) => cb(null, 'bucket'),
  '@architect/hydrate': () => ({ install: (params, cb) => cb() }),
  '@architect/utils': {
    toLogicalId: (s) => s,
    updater: () => ({ done: () => {}, status: () => {} }),
    fingerprint: (params, cb) => cb()
  },
  '@architect/package': () => baseCfn,
  './compat': (params, cb) => cb(null, _deploy),
  '../utils/size-report': (params, cb) => cb(),
  './00-before': (params, cb) => {
    // save the final CFN JSON for inspection
    // finalCfn = params.sam
    cb()
  },
  './01-deploy': (params, cb) => cb(),
  './02-after': (params, cb) => cb()
})

let invGetter = {
  get: {
    static: () => undefined
  }
}
let baseInv = {
  app: 'testapp',
  aws: {
  },
  _project: {
    arc: { }
  },
}

function resetCfnAndGenerateInventory (cfn, inv) {
  // reset the base cloudformation we will use as a fake returned from `package`
  baseCfn = cfn || { Resources: {} }
  // reset the var that captures the final compiled cfn right before writing it out
  // finalCfn = undefined
  // return a compiled inventory if provided
  let result = Object.assign({}, invGetter)
  result.inv = inv ? inv : baseInv
  return result
}

test('sam smoketest', t => {
  t.plan(1)
  let inventory = resetCfnAndGenerateInventory()
  sam({ inventory, shouldHydrate: false }, (err) => {
    t.notOk(err, 'no error during smoketest')
  })
})

// TODO restore once refactoring settles!
/*
test('sam internal arc-env macro mutations should be honoured', t => {
  t.plan(2)
  let inv = JSON.parse(JSON.stringify(baseInv))
  inv._project.env = {
    staging: {
      myEnvVar: 'sprettydope'
    }
  }
  let inventory = resetCfnAndGenerateInventory({
    Resources: {
      'SomeLambda': {
        Type: 'AWS::Serverless::Function',
        Properties: {
          Environment: {
            Variables: {}
          }
        }
      }
    }
  }, inv)
  sam({ inventory, shouldHydrate: false }, (err) => {
    t.notOk(err, 'no error')
    t.equals(finalCfn.Resources.SomeLambda.Properties.Environment.Variables.myEnvVar, 'sprettydope', 'env var from inventory set on lambda')
  })
})

test('plugin lambdas should have production env vars set when production is specified', t => {
  t.plan(3)
  let inv = JSON.parse(JSON.stringify(baseInv))
  inv._project.env = {
    production: {
      NODE_ENV: 'production'
    },
    staging: {
      NODE_ENV: 'staging'
    }
  }
  inv._project.plugins = {
    myPlugin: {
      package: function ({ cloudformation }) {
        cloudformation.Resources['MyPluginLambda'] = {
          Type: 'AWS::Serverless::Function',
          Properties: { Environment: { Variables: {} } }
        }
        return cloudformation
      }
    }
  }
  let inventory = resetCfnAndGenerateInventory({
    Resources: {
      'SomeHTTPLambda': {
        Type: 'AWS::Serverless::Function',
        Properties: {
          Environment: {
            Variables: {}
          }
        }
      }
    }
  }, inv)
  sam({ inventory, shouldHydrate: false, production: true }, (err) => {
    t.notOk(err, 'no error')
    t.ok(finalCfn.Resources.MyPluginLambda, 'plugin-generated lambda exists on cfn')
    t.equals(finalCfn.Resources.MyPluginLambda.Properties.Environment.Variables.NODE_ENV, 'production', 'production env var set on plugin-generated lambda')
  })
})
 */
