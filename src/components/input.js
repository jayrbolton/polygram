const { h } = require('uzu')
const deepMerge = require('../utils/deepMerge')

module.exports = function input (opts) {
  opts = deepMerge({
    style: {
      paddingTop: '0.3rem',
      paddingBottom: '0.2rem'
    },
    class: {
      'w-100': true,
      'sans-serif': true,
      f6: true,
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
