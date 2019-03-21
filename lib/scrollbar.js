class Scrollbar {

    constructor (data, canvas, scrollCanvas, options) {
        this.data = data
        this.canvas = canvas
        this.scrollCanvas = scrollCanvas

        this.el = document.createElement('div')
        this.el.className = 'scroll'
        this.leftAreaEl = document.createElement('div')
        this.leftAreaEl.className = 'left_area'
        this.rightAreaEl = document.createElement('div')
        this.rightAreaEl.className = 'right_area'
        this.scrollBoxEl = document.createElement('div')
        this.scrollBoxEl.className = 'scroll-box'
        this.scrollBoxLeftBorderEl = document.createElement('div')
        this.scrollBoxLeftBorderEl.className = 'scroll-box-border-left'
        this.scrollBoxRightBorderEl = document.createElement('div')
        this.scrollBoxRightBorderEl.className = 'scroll-box-border-right'

        this.scrollBoxEl.appendChild(this.scrollBoxLeftBorderEl)
        this.scrollBoxEl.appendChild(this.scrollBoxRightBorderEl)

        this.el.appendChild(scrollCanvas.el)
        this.el.appendChild(this.leftAreaEl)
        this.el.appendChild(this.rightAreaEl)
        this.el.appendChild(this.scrollBoxEl)

        this.from = options.from
        this.to = options.to
        this.padW = options.padW
        this.border = options.border

        this.move = 'no'

        this.scrollBoxEl.addEventListener('mousedown', e => this.onMoveBoth(e))
        this.scrollBoxLeftBorderEl.addEventListener('mousedown', e => this.onMoveLeft(e))
        this.scrollBoxRightBorderEl.addEventListener('mousedown', e => this.onMoveRight(e))
        this.el.addEventListener('mouseup', e => this.onMouseUp(e))
        this.el.addEventListener('mouseleave', e => this.onMouseUp(e))
        this.el.addEventListener('mousemove', e => this.onMouseMove(e))
        // this.scrollBoxLeftBorderEl.addEventListener('mousemove', e => this.onMouseMove(e))
        // this.scrollBoxRightBorderEl.addEventListener('mousemove', e => this.onMouseMove(e))
    }

    render () {
        this.scrollCanvas.render()
        this.drawAreas()
        this.drawScrollBox()
    }

    drawAreas () {
        const scrollWidth = this.el.offsetWidth - 2 * this.padW
        this.leftAreaEl.style.width = (scrollWidth * this.from) + 'px'
        this.leftAreaEl.style.left = (this.padW) + 'px'
        this.rightAreaEl.style.width = (scrollWidth * (1 - this.to)) + 'px'
        this.rightAreaEl.style.left = (this.padW + this.to * scrollWidth) + 'px'
    }

    drawScrollBox () {
        const scrollWidth = this.el.offsetWidth - 2 * this.padW
        this.scrollBoxEl.style.width = ((this.to - this.from) * scrollWidth) + 'px'
        this.scrollBoxEl.style.left = (this.padW + this.from * scrollWidth) + 'px'
    }

    onMoveBoth (e) {
        this.move = 'both'
        this.leftOffset = e.clientX - this.scrollBoxEl.offsetLeft
        this.lastWidth = this.scrollBoxEl.offsetWidth
        e.stopPropagation()
        return true
    }

    onMoveLeft (e) {
        this.move = 'left'
        this.leftOffset = e.clientX - this.scrollBoxEl.offsetLeft
        this.lastWidth = this.scrollBoxEl.offsetWidth
        e.stopPropagation()
        return true
    }

    onMoveRight (e) {
        this.move = 'right'
        this.leftOffset = e.clientX - this.scrollBoxEl.offsetLeft
        this.lastWidth = this.scrollBoxEl.offsetWidth
        e.stopPropagation()
        return true
    }

    onMouseUp (e) {
        this.move = 'no'
    }

    onMouseMove (e) {

        if (this.move === 'no') {
            return
        }

        const scrollWidth = this.el.offsetWidth - 2 * this.padW
        const currentLeftOffset = e.clientX - this.scrollBoxEl.offsetLeft

        const offsetDiff = currentLeftOffset - this.leftOffset
        const dOffset = offsetDiff / scrollWidth
        if (this.move === 'left') {
            this.from += dOffset
            if (this.from > this.to) {
                this.from = this.to
            }
        } else if (this.move === 'right') {
            const dOffset = (offsetDiff - this.scrollBoxEl.offsetWidth + this.lastWidth) / scrollWidth
            this.to += dOffset
            if (this.from > this.to) {
                this.to = this.from
            }
        } else {
            if (this.to < 1) {
                this.from += dOffset
            }
            if (this.from > 0) {
                this.to += dOffset
            }
        }

        if (this.from < 0) {
            this.from = 0
        }

        if (this.to > 1) {
            this.to = 1
        }

        this.drawAreas()
        this.drawScrollBox()
        this.canvas.move(this.from, this.to)
    }
}

export default Scrollbar
