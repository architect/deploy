let test = require('tape')
let plugins = require('../../../../src/sam/plugins')

function one (params) {
  let { cloudformation } = params
  cloudformation.Resources['OneSNS'] = {
    Type: 'AWS::SNS'
  }
  return cloudformation
}
function two (params) {
  let { cloudformation } = params
  cloudformation.Resources['TwoSQS'] = {
    Type: 'AWS::SQS'
  }
  return cloudformation
}
one.type = two.type = 'plugin'

let inventory = {
  inv: {
    _project: { arc: [] },
    plugins: {
      _methods: { deploy: {
        start: [ one, two ]
      } }
    }
  }
}

let fakeCfn = {
  Resources: []
}

test('deploy.start should be able to modify CloudFormation', t => {
  t.plan(2)
  let cloudformation = JSON.parse(JSON.stringify(fakeCfn))
  plugins.start({ inventory, cloudformation, stage: 'staging' }, (err, result) => {
    if (err) {
      console.error(err)
      t.fail(err)
    }
    else {
      t.ok(result.Resources.OneSNS, 'first plugin added a resource')
      t.ok(result.Resources.TwoSQS, 'second plugin added a resource')
    }
  })
})
