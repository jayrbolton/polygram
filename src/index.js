const { Component, h } = require('uzu')

// Components and views
const { CanvasState } = require('./components/CanvasState')
const { Canvas } = require('./components/Canvas')

function App () {
  // State of the drawing, including all the sidebar option fields.
  const canvasState = CanvasState()
  // The actual canvas element, which wraps the draw() function
  const canvas = Canvas(canvasState)
  return Component({
    canvasState,
    canvas,
    view () {
      return h('div.flex', [
        this.canvasState.view(),
        this.canvas.view()
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
