class Checkboxes {

    constructor (data, canvas, scrollCanvas) {
        this.data = data
        this.canvas = canvas
        this.scrollCanvas = scrollCanvas

        this.el = document.createElement('div')
        for (let label in data.names) {
            const checkboxEl = document.createElement('input')
            checkboxEl.type = 'checkbox'
            checkboxEl.id = label
            checkboxEl.addEventListener('click', (e) => this.onCheck(label, checkboxEl))
            const labelEl = document.createElement('label')
            labelEl.htmlFor = label
            labelEl.innerText = data.names[label]
            this.el.appendChild(checkboxEl)
            this.el.appendChild(labelEl)
        }
    }

    render () {}

    onCheck (label, checkboxEl) {
        if (checkboxEl.checked) {
            this.canvas.disable(label)
            this.scrollCanvas.disable(label)
        } else {
            this.canvas.enable(label)
            this.scrollCanvas.enable(label)
        }
    }
}

export default Checkboxes
