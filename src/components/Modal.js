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
    view ({ title, content }) {
      return h('div.code', [
        // Backdrop
        h('div.fixed.w-100.h-100.top-0.left-0.o-20.bg-black.z-1', {
          class: {
            dn: !this.isOpen
          },
          style: {
          },
          on: {
            click: () => this.close()
          }
        }),
        // Modal
        h('div.fixed.top-1.shadow-3.bg-white.z-2', {
          style: {
            left: '50%',
            width: '32rem',
            marginLeft: '-16rem'
          },
          class: {
            dn: !this.isOpen
          }
        }, [
          h('div.flex.justify-between.bb.b--black-20.pa3', [
            h('h1.f4.ma0', [
              title
            ]),
            button('Close', () => this.close())
          ]),
          h('div.pa3', [
            content
          ])
        ])
      ])
    }
  })
}
