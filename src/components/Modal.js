// simple modal component
const { Component, h } = require('uzu')

const button = require('./button')

module.exports = { Modal }

function Modal () {
  return Component({
    isOpen: false,
    open () {
      this.isOpen = true
      this._render()
    },
    close () {
      this.isOpen = false
      this._render()
    },
    view ({ title, content, width = 32 }) {
      return h('div.sans-serif.white', [
        // Backdrop
        h('div.fixed.w-100.h-100.top-0.left-0.o-60.bg-black.z-1', {
          class: {
            dn: !this.isOpen
          },
          on: {
            click: () => this.close()
          }
        }),
        // Modal
        h('div.fixed.top-1.bg-dark-gray.shadow-3.z-2', {
          style: {
            left: '50%',
            width: width + 'rem',
            marginLeft: -width / 2 + 'rem'
          },
          class: {
            dn: !this.isOpen
          }
        }, [
          h('div.flex.justify-between.bb.b--black-20.pa3.items-center', [
            h('h1.f4.ma0', [
              title
            ]),
            button('button', {
              on: { click: () => this.close() }
            }, 'Close')
          ]),
          h('div.pa3', [
            content
          ])
        ])
      ])
    }
  })
}
