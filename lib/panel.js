class Panel {

    constructor (canvas, scrollbar, checkboxes) {
        const div = document.createElement('div')
        div.appendChild(canvas.el)
        div.appendChild(scrollbar.el)
        div.appendChild(checkboxes.el)
        this.canvas = canvas
        this.scrollbar = scrollbar
        this.checkboxes = checkboxes
        this.el = div
    }

    render (parent) {
        this.canvas.render()
        this.scrollbar.render()
        this.checkboxes.render()
    }

    destroy () {
        this.el.remove()
    }
}

export default Panel
