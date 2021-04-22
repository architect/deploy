module.exports = {
  package: function ({ cloudformation }) {
    cloudformation.pluginOne = true
    return cloudformation
  }
}
