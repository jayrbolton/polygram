const { h } = require('uzu')

module.exports = function icon (name) {
  const style = {
    width: '0.9rem',
    height: '0.9rem',
    stroke: 'currentColor',
    strokeWidth: 0,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none'
  }
  return h('span.dib.v-mid', {
    style: {
      marginTop: '-0.1rem',
      marginBottom: '-0.2rem',
    },
    hook: {
      insert: (vnode) => {
        vnode.elm.innerHTML = window.feather.icons[name].toSvg(style)
      }
    }
  })
}
