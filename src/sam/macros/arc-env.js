let aws = require('aws-sdk')
let utils = require('util')

/**
 * reads SSM for env vars and resets NODE_ENV
 */
module.exports = async function env(arc, cfn) {
  let appname = arc.app[0]
  let getAll = utils.promisify(all)
  let variables = await getAll(appname)
  let filtered = variables.filter(v=> v.env === process.env.NODE_ENV)
  Object.keys(cfn.Resources).forEach(r=> {
    let isFunction = cfn.Resources[r].Type === 'AWS::Serverless::Function'
    if (isFunction) {
      cfn.Resources[r].Properties.Environment.Variables.NODE_ENV = process.env.NODE_ENV
      filtered.forEach(v=> {
        cfn.Resources[r].Properties.Environment.Variables[v.name] = v.value
      })
    }
  })
  return cfn
}

/**
 * lifted from architect/env
 * reads all the env vars for a given appname
 */
function all(appname, callback) {

  let ssm = new aws.SSM({region: process.env.AWS_REGION})

  // reset this every call..
  let result = []

  function getSome(appname, NextToken, callback) {
    // base query to ssm
    let query = {
      Path: `/${appname}`,
      Recursive: true,
      MaxResults: 10,
      WithDecryption: true
    }
    // check if we're paginating
    if (NextToken) {
      query.NextToken = NextToken
    }
    // performs the query
    ssm.getParametersByPath(query, function _query(err, data) {
      if (err) {
        callback(err)
      }
      else {
        // tidy up the response
        result = result.concat(data.Parameters.map(function(param) {
          let bits = param.Name.split('/')
          return {
            app: appname,
            env: bits[2],
            name: bits[3],
            value: param.Value,
          }
        }))
        // check for more data and, if so, recurse
        if (data.NextToken) {
          getSome(appname, data.NextToken, callback)
        }
        else {
          // otherwise callback
          callback(null, result)
        }
      }
    })
  }

  getSome(appname, false, function done(err, result) {
    if (err) callback(err)
    else {
      callback(null, result)
    }
  })
}
