// helper to swap express style :paramID for api gateway style {paramID}
module.exports = function unexpressRoute (completeRoute) {
  var parts = completeRoute.split('/')
  var better = parts.map(function unexpressPart (part) {
    var isParam = part[0] === ':'
    if (isParam) {
      return `{${part.replace(':', '')}}`
    }
    else {
      return part
    }
  })
  return `${better.join('/')}`
}

