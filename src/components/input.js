const { h } = require('uzu')
const deepMerge = require('../utils/deepMerge')

module.exports = function input (opts) {
  opts = deepMerge({
    class: {
      'w-100': true,
      'sans-serif': true,
      pt2: true,
      f6: true,
      pb1: true,
      ph2: true,
      'bg-black-40': true,
      'white-90': true,
      'b--black': true,
      ba: true,
      'outline-0': true
    }
  }, opts)
  return h('input', opts)
}
