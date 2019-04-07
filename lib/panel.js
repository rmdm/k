class Panel {

    constructor (canvas, checkboxes, options) {
        const div = document.createElement('div')
        div.className = 'panel'

        const titleEl = document.createElement('h4')
        titleEl.className = 'chart-title'
        titleEl.textContent = options.header

        div.appendChild(titleEl)
        div.appendChild(canvas.el)
        div.appendChild(checkboxes.el)
        this.canvas = canvas
        this.checkboxes = checkboxes
        this.el = div
    }

    render () {
        this.canvas.render()
        this.checkboxes.render()
    }

    scale (width) {
        this.canvas.setWidth(width, true)
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
