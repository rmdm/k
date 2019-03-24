class NightSwitch {

    constructor (cb) {
        this.cb = cb

        this.state = false

        this.el = document.createElement('div')
        this.el.className = 'night-switch day'
        this.textEl = document.createElement('span')
        this.textEl.className = 'night-switch-text'
        this.el.appendChild(this.textEl)

        this.el.addEventListener('click', () => this.switch())

        this.setText()
    }

    switch () {
        this.state = !this.state
        const bodyEl = document.getElementsByTagName('body')[0]
        this.state ? bodyEl.className = 'night' : bodyEl.className = 'day'
        this.state ? this.el.className = 'night-switch night' : this.el.className = 'night-switch day'
        this.setText()
        this.cb(this.state)
    }

    setText () {
        this.textEl.textContent = this.state
            ? 'Switch to Day Mode'
            : 'Switch to Night Mode'
    }
}

export default NightSwitch
