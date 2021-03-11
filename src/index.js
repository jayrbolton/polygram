const { Component, h } = require('uzu')

// Components and views
const { CanvasState } = require('./components/CanvasState')
const { Canvas } = require('./components/Canvas')
const { IntroModal } = require('./components/IntroModal')

function App () {
  // State of the drawing, including all the sidebar option fields.
  const canvasState = CanvasState()
  // The actual canvas element, which wraps the draw() function
  const canvas = Canvas(canvasState)
  canvasState.canvas = canvas
  const introModal = IntroModal(canvasState)
  window._openIntroModal = introModal.open.bind(introModal)
  return Component({
    canvasState,
    canvas,
    introModal,
    showIntro () {
      introModal.open()
      this._render()
    },
    view () {
      return h('div.flex.bg-black-80', [
        this.canvasState.view(),
        this.canvas.view(),
        introModal.view()
      ])
    }
  })
}

// Track the mouse x/y coords globally
document.body.addEventListener('mousemove', ev => {
  document._mouseX = ev.clientX
  document._mouseY = ev.clientY
})

// Initialize the top-level component
const app = App()

// Load a canvas state from the url hash, if present
if (document.location.hash.length) {
  const compressed = document.location.hash.replace(/^#/, '')
  app.canvasState.restoreCompressed(compressed)
}

// Mount to the page
document.body.appendChild(app.view().elm)

if (document.location.hash.length === 0) {
  app.showIntro()
}
