const { h } = require('uzu')
const deepMerge = require('../utils/deepMerge')

module.exports = function button (tag, opts, children) {
  const clss = {
    'b--black-60': true,
    'bg-white-10': true,
    'no-underline': true,
    'sans-serif': true,
    'white-80': true,
    ba: true,
    br2: true,
    dib: true,
    f6: true,
    ma1: true,
    ph2: true,
    tc: true
  }
  if (opts.props && opts.props.disabled) {
    clss.gray = opts.props && opts.props.disabled
  } else {
    clss.pointer = true
    clss.dim = true
  }
  opts = deepMerge({
    class: clss,
    style: {
      paddingTop: '0.5rem',
      paddingBottom: '0.4rem'
    }
  }, opts)
  return h(tag, opts, children)
}
