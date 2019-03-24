class Panel {

    constructor (canvas, scrollbar, scrollCanvas, checkboxes, options) {
        const div = document.createElement('div')
        div.className = 'panel'

        const titleEl = document.createElement('h4')
        titleEl.className = 'chart-title'
        titleEl.textContent = options.header

        div.appendChild(titleEl)
        div.appendChild(canvas.el)
        div.appendChild(scrollbar.el)
        div.appendChild(checkboxes.el)
        this.canvas = canvas
        this.scrollbar = scrollbar
        this.scrollCanvas = scrollCanvas
        this.checkboxes = checkboxes
        this.el = div
    }

    render () {
        this.canvas.render()
        this.scrollbar.render()
        this.checkboxes.render()
    }

    scale (width) {
        this.canvas.setSize(width, 320, true)
        this.scrollCanvas.setSize(width, 32, true)
        this.render()
    }

    nightMode (enable) {
        this.canvas.nightMode(enable)
    }

    destroy () {
        this.el.remove()
    }
}

export default Panel
