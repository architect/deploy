module.exports = {
  package: function ({ cloudformation }) {
    cloudformation.pluginTwo = true
    return cloudformation
  }
}
