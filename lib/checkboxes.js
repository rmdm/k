let checkboxCount = 0

class Checkboxes {

    constructor (data, canvas) {
        this.data = data
        this.canvas = canvas

        this.el = document.createElement('div')
        for (let label in data.names) {

            const checkboxId = 'checkbox' + checkboxCount++

            const checkboxEl = document.createElement('div')
            checkboxEl.className = 'checkbox'

            const checkEl = document.createElement('input')
            checkEl.className = 'check'
            checkEl.type = 'checkbox'
            checkEl.id = checkboxId
            checkEl.addEventListener('click', () => this.onCheck(label, checkEl))

            const checkSignEl = document.createElement('div')
            checkSignEl.className = 'sign'

            const checkSignBgEl = document.createElement('div')
            checkSignBgEl.className = 'sign-bg'
            checkSignBgEl.style['border-color'] = data.colors[label]

            const labelEl = document.createElement('label')
            labelEl.className = 'label'
            labelEl.htmlFor = checkboxId
            labelEl.textContent = data.names[label]

            checkboxEl.appendChild(checkEl)
            checkboxEl.appendChild(checkSignBgEl)
            checkboxEl.appendChild(checkSignEl)
            checkboxEl.appendChild(labelEl)
            this.el.appendChild(checkboxEl)
        }
    }

    render () {}

    onCheck (label, checkboxEl) {
        if (checkboxEl.checked) {
            this.canvas.disable(label)
        } else {
            this.canvas.enable(label)
        }
    }
}

export default Checkboxes
