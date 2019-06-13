const { Component, h } = require('uzu')
const button = require('./button')

module.exports = { Canvas }

function Canvas (canvasState) {
  return Component({
    canvasState,
    isCapturing: false,

    // Dumb toggle on play/pause of the canvas record feature.
    toggleCapture () {
      this.isCapturing ? this.stopCapture() : this.startCapture()
    },

    // Start recording video of the canvas.:w
    startCapture () {
      if (!window.MediaRecorder || !window.MediaRecorder.isTypeSupported('video/webm')) {
        window.alert('Video recording is not supported in your browser. Try Firefox or Chrome instead.')
        return
      }
      this.mediaRecorder = new window.MediaRecorder(this.canvas.captureStream(), {
        mimeType: 'video/webm'
      })
      this.mediaRecorder.ondataavailable = ev => {
        downloadBlob(ev.data, 'polygram.webm')
      }
      this.mediaRecorder.start()
      this.isCapturing = true
      this._render()
    },

    // Stop and save the canvas recording as a webm video.
    // Most of the actual video save logic is found in the ondataavailable event listener above.
    stopCapture () {
      this.mediaRecorder.stop()
      this.isCapturing = false
      this._render()
    },

    view () {
      const leftPad = this.canvasState.sidebarWidth + 20 + 'px'
      const canvas = h('canvas', {
        props: { id: 'tutorial' },
        hook: {
          insert: (vnode) => handleCanvasDrawLoop(vnode, this)
        }
      })
      return h('div.fixed.top-0', { style: { left: leftPad } }, [
        recordComponent(this),
        canvas
      ])
    }
  })
}

// Button component to record the canvas to a webm video
function recordComponent (canvasCmp) {
  return h('div.tr.pv1', [
    h('span.mr1.color--black-40.code', [
      canvasCmp.isCapturing ? 'Recording...' : ''
    ]),
    button({
      on: { click: () => canvasCmp.toggleCapture() }
    }, canvasCmp.isCapturing ? 'Stop & save' : 'Record canvas', 'a')
  ])
}

// Initialize and run the animation loop for the canvas
// canvasCmp is the Canvas component instance.
function handleCanvasDrawLoop (vnode, canvasCmp) {
  const elm = vnode.elm
  // Assign to both CanvasState and Canvas components to give access to this canvas elem
  const canvasState = canvasCmp.canvasState
  canvasState.elm = elm
  canvasCmp.canvas = elm
  elm.width = canvasState.canvasWidth
  elm.height = canvasState.canvasHeight
  const ctx = elm.getContext('2d')
  ctx.globalCompositeOperation = 'source-over'
  ctx.save()
  function draw (ts) {
    document._ts = ts
    ctx.fillStyle = canvasState.fillStyle || 'white'
    ctx.fillRect(0, 0, canvasState.canvasWidth, canvasState.canvasHeight)
    for (let id in canvasState.layers) {
      let shape = canvasState.layers[id]
      if (shape.draw) shape.draw(ctx)
    }
    window.requestAnimationFrame(draw)
  }
  draw()
}

// Auto-download a blob object
function downloadBlob (blob, filename) {
  const link = document.createElement('a')
  link.style.display = 'none'
  const downloadUrl = window.URL.createObjectURL(blob)
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}
