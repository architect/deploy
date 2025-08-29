module.exports = {
  deploy: {
    start: function ({ cloudformation }) {
      cloudformation.pluginTwo = true
      return cloudformation
    }
  }
}
