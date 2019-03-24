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
        this.bound = options.bound

        this.move = 'no'

        this.scrollBoxEl.addEventListener('mousedown', e => this.onMouseBoth(e))
        this.scrollBoxLeftBorderEl.addEventListener('mousedown', e => this.onMouseLeft(e))
        this.scrollBoxRightBorderEl.addEventListener('mousedown', e => this.onMouseRight(e))
        this.el.addEventListener('mouseup', e => this.onMouseUp(e))
        this.el.addEventListener('mouseleave', e => this.onMouseUp(e))
        this.el.addEventListener('mousemove', e => this.onMouseMove(e))

        this.scrollBoxEl.addEventListener('touchstart', e => this.onTouchBoth(e))
        this.scrollBoxLeftBorderEl.addEventListener('touchstart', e => this.onTouchLeft(e))
        this.scrollBoxRightBorderEl.addEventListener('touchstart', e => this.onTouchRight(e))
        this.el.addEventListener('touchend', e => this.onTouchEnd(e))
        this.el.addEventListener('touchmove', e => this.onTouchMove(e))
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

    setNoMove () {
        this.move = 'no'
    }

    setLeftMove (clientX) {
        this.move = 'left'
        this.leftOffset = clientX - this.scrollBoxEl.offsetLeft
        this.lastWidth = this.scrollBoxEl.offsetWidth
    }

    setRightMove (clientX) {
        this.move = 'right'
        this.leftOffset = clientX - this.scrollBoxEl.offsetLeft
        this.lastWidth = this.scrollBoxEl.offsetWidth
    }

    setBothMove (clientX) {
        this.move = 'both'
        this.leftOffset = clientX - this.scrollBoxEl.offsetLeft
        this.lastWidth = this.scrollBoxEl.offsetWidth
    }

    setMove (moveOffset) {

        if (this.move === 'no') {
            return
        }

        const scrollWidth = this.el.offsetWidth - 2 * this.padW
        const currentLeftOffset = moveOffset - this.scrollBoxEl.offsetLeft

        const offsetDiff = currentLeftOffset - this.leftOffset
        const dOffset = offsetDiff / scrollWidth
        const bound = 2 * this.bound / scrollWidth

        if (this.move === 'left') {
            this.from += dOffset
            if (this.from + bound > this.to) {
                this.from = this.to - bound
            }
            if (this.from < 0) {
                this.from = 0
            }
        } else if (this.move === 'right') {
            const dOffset = (offsetDiff - this.scrollBoxEl.offsetWidth + this.lastWidth) / scrollWidth
            this.to += dOffset
            if (this.from + bound > this.to) {
                this.to = this.from + bound
            }
            if (this.to > 1) {
                this.to = 1
            }
        } else {
            this.from += dOffset
            this.to += dOffset
            if (this.from < 0) {
                this.to = this.to - this.from
                this.from = 0
            }
            if (this.to > 1) {
                this.from = this.from - (this.to - 1)
                this.to = 1
            }
        }

        this.drawAreas()
        this.drawScrollBox()
        this.canvas.move(this.from, this.to)
    }

    onMouseBoth (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setBothMove(e.clientX)
    }

    onMouseLeft (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setLeftMove(e.clientX)
    }

    onMouseRight (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setRightMove(e.clientX)
    }

    onMouseUp (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setNoMove(e.clientX)
    }

    onMouseMove (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setMove(e.clientX)
    }

    onTouchBoth (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setBothMove(e.targetTouches[0].clientX)
    }

    onTouchLeft (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setLeftMove(e.targetTouches[0].clientX)
    }

    onTouchRight (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setRightMove(e.targetTouches[0].clientX)
    }

    onTouchEnd (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setNoMove(e.changedTouches[0].clientX)
    }

    onTouchMove (e) {
        e.stopPropagation()
        e.preventDefault()
        this.setMove(e.targetTouches[0].clientX)
    }
}

export default Scrollbar
