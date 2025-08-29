module.exports = {
  deploy: {
    start: function ({ cloudformation }) {
      cloudformation.pluginOne = true
      return cloudformation
    }
  }
}
