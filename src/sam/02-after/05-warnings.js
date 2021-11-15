module.exports = function printWarnings (params, callback) {
  let { inventory, update } = params
  let { inv } = inventory
  if (inv.indexes) {
    update.warn('@indexes will be deprecated in Architect 10; please update the pragma name to @tables-indexes, learn more at https://arc.codes/tables-indexes')
  }
  callback()
}
