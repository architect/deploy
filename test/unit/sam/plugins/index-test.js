let test = require('tape')
let plugins = require('../../../../src/sam/plugins')

let inv = {
  inv: {
    _project: {
      arc: [],
      plugins: {
        one: {
          package: function (params) {
            let { cloudformation } = params
            cloudformation.Resources['OneSNS'] = {
              Type: 'AWS::SNS'
            }
            return cloudformation
          },
          variables: function () {
            return {
              one: 'ring',
              to: 'rule'
            }
          }
        },
        two: {
          package: function (params) {
            let { cloudformation } = params
            cloudformation.Resources['TwoSQS'] = {
              Type: 'AWS::SQS'
            }
            return cloudformation
          },
          variables: function () {
            return {
              two: 'bananas'
            }
          }
        }
      }
    }
  }
}

let fakeCfn = {
  Resources: []
}

test('plugins should be able to modify CloudFormation via their package methods', t => {
  t.plan(2)
  let cfn = JSON.parse(JSON.stringify(fakeCfn))
  plugins(inv, cfn, 'staging', (err, result) => {
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

test('plugin variable method output should be converted to SSM Parameters', t => {
  t.plan(6)
  let cfn = JSON.parse(JSON.stringify(fakeCfn))
  plugins(inv, cfn, 'staging', (err, result) => {
    if (err) {
      console.error(err)
      t.fail(err)
    }
    else {
      t.ok(result.Resources.OneoneParam, 'first plugin added one of two variables')
      t.equals(result.Resources.OneoneParam.Properties.Value, 'ring', 'first plugin first variable value correctly defined')
      t.ok(result.Resources.OnetoParam, 'first plugin added two of two variables')
      t.equals(result.Resources.OnetoParam.Properties.Value, 'rule', 'first plugin second variable value correctly defined')
      t.ok(result.Resources.TwotwoParam, 'second plugin added its variable')
      t.equals(result.Resources.TwotwoParam.Properties.Value, 'bananas', 'second plugin single variable value correctly defined')
    }
  })
})
