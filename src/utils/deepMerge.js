// Mutates obj1
module.exports = function deepMerge (obj1, obj2) {
  for (const key in obj2) {
    if (!(key in obj1) || !isObj(obj2[key])) {
      obj1[key] = obj2[key]
    } else {
      deepMerge(obj1[key], obj2[key])
    }
  }
  return obj1
}

function isObj (obj) {
  return typeof obj === 'object' && obj !== null
}
