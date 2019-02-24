const { h } = require('uzu')

module.exports = newElemButton

function newElemButton (parentCmp, constructor, name) {
  return h('button', {
    on: {
      click: () => {
        const cmp = constructor(parentCmp)
        parentCmp.elems[cmp.name] = cmp
        parentCmp.elemOrder.push(cmp)
        parentCmp._render()
      }
    }
  }, ['Add ', name])
}
