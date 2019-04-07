let pixelRatio = window.devicePixelRatio || 1

function toCssSize (value) {
    return value / pixelRatio
}

function fromCssSize (value) {
    return value * pixelRatio
}

const animationDurationMs = 250
const dateOffset = fromCssSize(18)

const controlWidth = fromCssSize(10)
const previewPadding = fromCssSize(2)
const controlRadius = fromCssSize(8)

const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ]

const getAxisColor = function (alpha) {
    return colorFromRGBA(100, 130, 140, 0.7 * alpha)
}

const getMeshColor = function (alpha) {
    return colorFromRGBA(155, 180, 190, 0.2 * alpha)
}

let previewBlurColor = colorFromRGBA(229, 243, 247, 0.5)
let previewControlColor = colorFromRGBA(186, 209, 223, 1)

class Canvas {

    constructor (data, options) {

        this.data = data
        this.decor = options.decor

        this.x = getX(data)
        this.lines = getLines(data)

        this.el = document.createElement('div')
        this.el.className = 'chart'

        this.canvasEl = document.createElement('canvas')
        this.ctx = this.canvasEl.getContext('2d')

        this.setFont(options)
        this.setBasicSizes(options)
        this.setSize(options)

        this.currentLeft = this.scrollLeft = options.from
        this.currentRight = this.scrollRight = options.to
        this.currentRange = options.to - options.from

        this.xDiff = this.x[this.x.length - 1] - this.x[1]

        this.lineStates = {}
        this.lineGrades = {}
        this.lineColors = {}
        for (let label in data.names) {
            this.lineStates[label] = true
            this.lineGrades[label] = 1
            this.lineColors[label] = colorFromHex(data.colors[label])
        }

        this.fromHeight = this.toHeight = this.currentHeight =
            this.getMaxY(options.from, options.to)
        this.heightGrade = 1

        this.fromPeriod = this.toPeriod = 0
        this.datesGrade = 1

        this.prevMs = undefined

        this.el.appendChild(this.canvasEl)

        this.legendEl = document.createElement('div')
        this.legendEl.className = 'legend'

        this.legendTitleEl = document.createElement('div')
        this.legendTitleEl.className = 'legend-title'
        this.legendEl.appendChild(this.legendTitleEl)

        this.rulerEl = document.createElement('div')
        this.rulerEl.className = 'ruler'
        this.rulerEl.style.height = toCssSize(this.height - this.padH) + 'px'
        this.el.appendChild(this.rulerEl)

        this.legendLines = { els: {}, values: {}, cross: {} }
        for (let label in data.names) {

            const lineEl = this.legendLines.els[label] = document.createElement('div')
            lineEl.className = 'legend-line'

            const lineValEl = this.legendLines.values[label] = document.createElement('div')
            lineValEl.className = 'legend-value'

            const lineLabelEl = document.createElement('div')
            lineLabelEl.className = 'legend-label'
            lineLabelEl.textContent = data.names[label]

            const lineCrossEl = this.legendLines.cross[label] = document.createElement('div')
            lineCrossEl.className = 'line-cross'
            lineCrossEl.style['border-color'] = this.getLineColor(label, 1)

            this.el.appendChild(lineCrossEl)

            lineEl.appendChild(lineValEl)
            lineEl.appendChild(lineLabelEl)

            lineEl.style.color = this.getLineColor(label, 1)
            this.legendEl.appendChild(lineEl)
        }

        this.el.appendChild(this.legendEl)

        this.el.addEventListener('mousemove', e => this.onMouseMove(e))
        this.el.addEventListener('mouseleave', e => this.onMouseLeave(e))
        this.el.addEventListener('mouseenter', e => this.onMouseEnter(e))
        this.el.addEventListener('mouseup', e => this.onMouseUp(e))
        this.el.addEventListener('mousedown', e => this.onMouseDown(e))

        this.el.addEventListener('touchmove', e => this.onTouchMove(e))
        this.el.addEventListener('touchstart', e => this.onTouchStart(e))
        this.el.addEventListener('touchend', e => this.onTouchEnd(e))
        this.moveDir = 'no'

        this.hideLegend()
    }

    move (left, right) {
        this.currentLeft = left
        this.currentRight = right
        this.currentRange = right - left
        this.animate()
    }

    disable (label) {
        if (this.lineStates[label]) {
            this.lineStates[label] = false
            this.lineGrades[label] = 1 - this.lineGrades[label]
            this.animate()
            if (this.decor) {
                this.legendLines.els[label].style.display = 'none'
                this.legendLines.cross[label].style.display = 'none'
            }
        }
    }

    enable (label) {
        if (!this.lineStates[label]) {
            this.lineStates[label] = true
            this.lineGrades[label] = 1 - this.lineGrades[label]
            this.animate()
            if (this.decor) {
                this.legendLines.els[label].style.display = 'inline-block'
            }
        }
    }

    animate () {

        if (this.animation) {
            cancelAnimationFrame(this.animation)
        }

        const step = (ms) => {

            if (!this.prevMs) {
                this.prevMs = ms
                this.animation = requestAnimationFrame(step)
                return
            }

            const diffMs = ms - this.prevMs
            this.prevMs = ms

            if (diffMs === 0) {
                this.animation = requestAnimationFrame(step)
                return
            }

            const animationGrade = diffMs / animationDurationMs

            this.heightGrade += animationGrade
            this.datesGrade += animationGrade

            if (this.heightGrade >= 1) {
                this.heightGrade = 1
                this.fromHeight = this.toHeight
            }

            if (this.datesGrade >= 1) {
                this.datesGrade = 1
                this.fromPeriod = this.toPeriod
            }

            let linesDone = true
            for (const label in this.lineGrades) {
                this.lineGrades[label] += animationGrade
                if (this.lineGrades[label] < 1) {
                    linesDone = false
                } else {
                    this.lineGrades[label] = 1
                }
            }

            if (this.heightGrade === 1 && this.datesGrade === 1 && linesDone) {
                this.prevMs = undefined
            } else {
                this.animation = requestAnimationFrame(step)
            }

            this.render()
        }

        this.animation = requestAnimationFrame(step)
    }

    clear () {
        this.ctx.clearRect(0, 0, this.width, this.height)
    }

    render () {
        this.clear()
        const dX = this.xDiff * (this.currentRange)
        let dY = this.getMaxY(this.currentLeft, this.currentRight)

        if (this.toHeight !== dY) {
            this.fromHeight = this.currentHeight
            this.heightGrade = 0
            this.toHeight = dY
        }

        this.currentHeight = approximate(this.fromHeight, this.toHeight, this.heightGrade)

        this.drawGrid(this.fromHeight, this.toHeight, this.currentHeight, this.heightGrade)
        // render when needed
        this.drawDates()

        this.drawLines(this.chartWidth, this.chartHeight, this.padW, this.padH, this.currentLeft, this.currentRight, dX, this.currentHeight, this.lineWidth)

        // render only on checkbox click
        const previewHeight = approximate(this.fromHeight, this.getMaxY(0, 1), this.heightGrade)
        this.drawLines(this.chartWidth, this.previewHeight, this.padW, this.previewOffsetH, 0, 1, this.xDiff, previewHeight, this.previewLineWidth)

        this.drawScrollControlls()
    }

    drawGrid (from, to, current, grade) {

        this.ctx.lineWidth = fromCssSize(this.lineWidth / 2)
        this.ctx.strokeStyle = getMeshColor(1)

        this.ctx.beginPath()

        this.ctx.moveTo(this.padW, this.chartHeight + this.padH)
        this.ctx.lineTo(this.padW + this.chartWidth, this.chartHeight + this.padH)

        this.ctx.stroke()

        let fromValuesDiff = from / 5
        let toValuesDiff = to / 5
        const fromLinesDiff = this.chartHeight / current * fromValuesDiff
        const toLinesDiff = this.chartHeight / current * toValuesDiff
        fromValuesDiff = Math.round(fromValuesDiff)
        toValuesDiff = Math.round(toValuesDiff)

        this.drawGridLines(toLinesDiff, toValuesDiff, grade)

        if (grade < 1) {
            this.drawGridLines(fromLinesDiff, fromValuesDiff, 1 - grade)
        }
    }

    drawGridLines (linesDiff, valuesDiff, grade) {

        this.ctx.fillStyle = getAxisColor(grade)
        this.ctx.strokeStyle = getMeshColor(grade)
        this.ctx.beginPath()

        for (
            let i = 0,
                y = this.chartHeight + this.padH - linesDiff,
                val = valuesDiff;
            i < 5;
            i++, y -= linesDiff, val += valuesDiff
        ) {
            this.ctx.fillText(val, this.padW, y - this.textSize / 2)
            this.ctx.moveTo(this.padW, y)
            this.ctx.lineTo(this.padW + this.chartWidth, y)
        }

        this.ctx.stroke()
    }

    drawDates () {

        if (this.currentRange <= (1 / this.x.length)) {
            this.fromPeriod = 0
            return
        }

        if (this.fromPeriod === 0) {
            this.fromPeriod = this.toPeriod =
                this.datesDiff * (this.currentRange) / this.chartWidth
        }

        const currentDiff = this.toPeriod * this.chartWidth / (this.currentRange)

        if (currentDiff >= 2 * this.datesDiff) {
            this.toPeriod = this.toPeriod / 2
            this.datesGrade = 0
        } else if (currentDiff < this.datesDiff) {
            if (this.fromPeriod < this.toPeriod) {
                this.fromPeriod = this.fromPeriod * 2
            }
            this.toPeriod = this.toPeriod * 2
            this.datesGrade = 0
        }

        const scale = this.chartWidth / (this.currentRange)
        const y = this.chartHeight + this.padH + 1.5 * this.textSize

        let fromFillStyle, toFillStyle

        if (this.fromPeriod > this.toPeriod) {
            toFillStyle = getAxisColor(this.datesGrade)
            fromFillStyle = getAxisColor(1)
        } else {
            toFillStyle = getAxisColor(1)
            fromFillStyle = getAxisColor(1 - this.datesGrade)
        }

        this.ctx.fillStyle = toFillStyle
        const toN = Math.floor(this.currentLeft / this.toPeriod) - 1
        for (let p = this.toPeriod * toN; p < this.currentRight + this.toPeriod; p += this.toPeriod) {
            this.drawDate(p, scale, y)
        }

        this.ctx.fillStyle = fromFillStyle
        const fromN = Math.floor(this.currentLeft / this.fromPeriod) - 1
        for (let p = this.fromPeriod * fromN; p < this.currentRight + this.fromPeriod; p += this.fromPeriod) {
            this.drawDate(p, scale, y)
        }
    }

    drawDate (p, scale, y) {
        const d = new Date(Math.floor(this.x[1] + this.xDiff * p))
        const text = months[d.getMonth()] + ' ' + d.getDate()
        this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale - dateOffset, y)
    }

    drawLines (width, height, offsetW, offsetH, left, right, dX, dY, lineWidth) {
        for (let line of this.lines) {
            if (this.lineStates[line[0]] || this.lineGrades[line[0]] < 1) {
                this.drawLine(line, width, height, offsetW, offsetH, left, right, dX, dY, lineWidth)
            }
        }
    }

    drawLine (line, width, height, offsetW, offsetH, left, right, dX, dY, lineWidth) {

        const scaleX = width / dX
        const scaleY = height / dY

        this.ctx.lineWidth = fromCssSize(lineWidth)
        this.ctx.strokeStyle = this.getStrokeStyle(line)

        const fromIndex = this.getLowerIndex(left - offsetW / width)
        const toIndex = this.getUpperIndex(right + offsetW / width)

        let prevX = this.x[fromIndex]
        let prevXCoord = offsetW +
            ((prevX - this.x[1]) / (this.xDiff) - left) * width / (right - left)

        const zeroH = offsetH + height

        this.ctx.beginPath()
        this.ctx.moveTo(prevXCoord, zeroH - line[fromIndex] * scaleY)

        for (let i = fromIndex + 1; i <= toIndex; i++) {

            const x = this.x[i]
            const y = line[i]

            const yCoord = zeroH - y * scaleY

            prevXCoord = prevXCoord + (x - prevX) * scaleX
            this.ctx.lineTo(prevXCoord, yCoord)
            prevX = x
        }

        this.ctx.stroke()
    }

    drawScrollControlls () {
        const left = this.padW + this.currentLeft * this.chartWidth + controlWidth
        const right = this.padW + this.currentRight * this.chartWidth - controlWidth
        const fromH = this.previewOffsetH - previewPadding
        const toH = this.previewOffsetH + this.previewHeight + previewPadding

        this.ctx.fillStyle = previewBlurColor
        this.ctx.beginPath()
        this.drawRoundedRect(this.padW, left, fromH, toH, controlRadius, 0, previewBlurColor)
        this.drawRoundedRect(right, this.width - this.padW, fromH, toH, 0, controlRadius, previewBlurColor)
        this.ctx.closePath()
        this.ctx.fill()

        this.ctx.fillStyle = previewControlColor
        this.ctx.beginPath()
        this.drawRoundedRect(left - controlWidth, left, fromH, toH, controlRadius, 0, previewControlColor)
        this.drawRoundedRect(right, right + controlWidth, fromH, toH, 0, controlRadius, previewControlColor)
        this.ctx.closePath()
        this.ctx.fill()

        this.ctx.strokeStyle = previewControlColor
        this.ctx.moveTo(left, fromH)
        this.ctx.lineTo(right, fromH)
        this.ctx.moveTo(left, toH)
        this.ctx.lineTo(right, toH)
        this.ctx.stroke()
    }

    drawRoundedRect (fromX, toX, fromY, toY, leftRadius, rightRadius) {
        this.ctx.moveTo(fromX + leftRadius, fromY)
        this.ctx.lineTo(toX - rightRadius, fromY)
        this.ctx.quadraticCurveTo(toX, fromY, toX, fromY + rightRadius)
        this.ctx.lineTo(toX, toY - rightRadius)
        this.ctx.quadraticCurveTo(toX, toY, toX - rightRadius, toY)
        this.ctx.lineTo(fromX + leftRadius, toY)
        this.ctx.quadraticCurveTo(fromX, toY, fromX, toY - leftRadius)
        this.ctx.lineTo(fromX, fromY + leftRadius)
        this.ctx.quadraticCurveTo(fromX, fromY, fromX + leftRadius, fromY)
    }

    setNoMove () {
        this.moveDir = 'no'
        this.scrollLeft = this.currentLeft
        this.scrollRight = this.currentRight
    }

    setMoveDir (dir, position) {
        this.moveDir = dir
        this.scrollStart = position
        this.scrollLeft = this.currentLeft
        this.scrollRight = this.currentRight
    }

    setMove (movePosition) {

        if (this.moveDir === 'no') {
            return
        }

        let from = this.scrollLeft, to = this.scrollRight

        const offsetDiff = fromCssSize(movePosition - this.scrollStart)
        const dOffset = offsetDiff / this.chartWidth
        const bound = 2 * controlWidth / this.chartWidth

        if (this.moveDir === 'left') {
            from += dOffset
            if (from + bound > to) {
                from = to - bound
            }
            if (from < 0) {
                from = 0
            }
        } else if (this.moveDir === 'right') {
            to += dOffset
            if (from + bound > to) {
                to = from + bound
            }
            if (to > 1) {
                to = 1
            }
        } else {
            from += dOffset
            to += dOffset
            if (from < 0) {
                to = to - from
                from = 0
            }
            if (to > 1) {
                from = from - (to - 1)
                to = 1
            }
        }

        this.move(from, to)
    }

    showLegend () {
        let someVisible = false
        for (const line of this.lines) {
            if (this.lineStates[line[0]]) {
                this.legendLines.cross[line[0]].style.display = 'block'
                someVisible = true
            }
        }
        if (someVisible) {
            this.legendEl.style.display = 'inline-block'
            this.rulerEl.style.display = 'block'
            this.moveLegendTo(0)
        }
    }

    hideLegend () {
        this.legendEl.style.display = 'none'
        this.rulerEl.style.display = 'none'
        for (const line of this.lines) {
            this.legendLines.cross[line[0]].style.display = 'none'
        }
    }

    moveLegendTo (moveOffset) {

        const canvasLeftOffset = this.el.getBoundingClientRect().left
        const offsetLeft = fromCssSize(moveOffset - canvasLeftOffset)

        let position = this.currentLeft + (offsetLeft - this.padW) / this.chartWidth * (this.currentRange)

        if (position < this.currentLeft) {
            position = this.currentLeft
        } else if (position > this.currentRight) {
            position = this.currentRight
        }

        const closestIndex = this.getClosestIndex(position)

        const percent = (this.x[closestIndex] - this.x[1]) / this.xDiff

        const d = new Date(Math.floor(this.x[1] + this.xDiff * percent))
        const text = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate()

        const xPos = this.padW + (percent - this.currentLeft) / (this.currentRange) * this.chartWidth

        const leftOffset = toCssSize(xPos)

        const legendOffsetWidth = this.legendEl.offsetWidth

        let additionalOffset = 0

        for (const line of this.lines) {
            if (this.lineStates[line[0]]) {

                const value = line[closestIndex]

                const topOffset = toCssSize(this.padH + this.chartHeight - value / this.currentHeight * this.chartHeight)

                this.legendLines.values[line[0]].textContent = value
                this.legendLines.cross[line[0]].style.top = topOffset - 5 + 'px'
                this.legendLines.cross[line[0]].style.left = leftOffset - 5 + 'px'
                if (topOffset - 10 < this.legendEl.offsetHeight) {
                    additionalOffset = legendOffsetWidth / 2 + 10
                }
            }
        }

        let nextOffset = leftOffset - legendOffsetWidth / 2 + additionalOffset

        if (nextOffset < 0) {
            additionalOffset = additionalOffset ? -additionalOffset : legendOffsetWidth / 2 + 10
        }

        const rightOverflow = nextOffset + legendOffsetWidth - toCssSize(this.chartWidth + this.padW)

        if (rightOverflow > 0) {
            additionalOffset = additionalOffset ? -additionalOffset : -legendOffsetWidth / 2 - 10
        }

        this.rulerEl.style.left = leftOffset + 'px'
        this.legendEl.style.left = leftOffset - legendOffsetWidth / 2 + additionalOffset + 'px'

        this.legendTitleEl.textContent = text
    }

    getMaxY (left, right) {

        let max = 0

        const from = this.getLowerIndex(left)
        const to = this.getUpperIndex(right)

        for (const line of this.lines) {

            if (!this.lineStates[line[0]]) {
                continue
            }

            for (let i = from; i < to; i++) {
                if (line[i] > max) {
                    max = line[i]
                }
            }
        }

        return max
    }

    getStrokeStyle (line) {
        const label = line[0]
        return this.lineStates[label]
            ? this.getLineColor(label, this.lineGrades[label])
            : this.getLineColor(label, (1 - this.lineGrades[label]))
    }

    setSize (options) {

        this.setWidth(options.width)

        const previewOffsetH = options.height + options.fontSize * 2
        const height = previewOffsetH + options.previewHeight + options.padH

        this.previewOffsetH = fromCssSize(previewOffsetH)

        this.height = fromCssSize(height)
        this.canvasEl.height = fromCssSize(height)
        this.canvasEl.style.height = height + 'px'

        this.chartHeight = fromCssSize(options.height - 2 * options.padH)
    }

    setWidth (width, resize) {

        this.width = fromCssSize(width)
        this.canvasEl.width = fromCssSize(width)
        this.canvasEl.style.width = width + 'px'

        this.chartWidth = this.width - 2 * this.padW

        if (resize) {
            this.ctx.font = this.textFont
        }
    }

    setFont (options) {
        this.textSize = fromCssSize(options.fontSize)
        this.textFont = this.textSize + 'px ' + options.fontFamily
        this.ctx.font = this.textFont
    }

    setBasicSizes (options) {
        this.padW = fromCssSize(options.padW)
        this.padH = fromCssSize(options.padH)
        this.datesDiff = fromCssSize(options.datesDiff)
        this.previewPadW = fromCssSize(options.previewPadW)
        this.previewPadH = fromCssSize(options.previewPadH)
        this.previewHeight = fromCssSize(options.previewHeight)
        this.lineWidth = options.lineWidth
        this.previewLineWidth = options.previewLineWidth
    }

    getLowerIndex (procent) {
        const closestIndex = this.getClosestIndex(procent)
        return Math.max(closestIndex - 1, 1)
    }

    getUpperIndex (procent) {
        const closestIndex = this.getClosestIndex(procent)
        return Math.min(closestIndex + 1, this.x.length - 1)
    }

    getClosestIndex (procent) {
        const val = this.x[1] + this.xDiff * procent
        return binarySearch(this.x, val, 1)
    }

    getLineColor (line, alpha) {
        return this.lineColors[line] + alpha + ')'
    }

    getDir (x, y) {

        const border = this.canvasEl.getBoundingClientRect()

        const canvasX = fromCssSize(x - border.left)
        const canvasY = fromCssSize(y - border.top)

        const fromW = this.padW + this.currentLeft * this.chartWidth - controlWidth
        const toW = this.padW + this.currentRight * this.chartWidth + controlWidth
        const fromH = this.previewOffsetH - previewPadding
        const toH = this.previewOffsetH + this.previewHeight + previewPadding

        if (canvasX < fromW || canvasX > toW || canvasY < fromH || canvasY > toH) {
            return 'no'
        }

        if (canvasX < fromW + 2 * controlWidth) {
            return 'left'
        } else if (canvasX > toW - 2 * controlWidth) {
            return 'right'
        } else {
            return 'both'
        }
    }

    nightMode (enable) {
        if (enable) {
            this.legendEl.className = 'legend night'
            for (let label in this.legendLines.cross) {
                this.legendLines.cross[label].className = 'line-cross night'
            }
            previewBlurColor = colorFromRGBA(28, 43, 53, 0.5)
            previewControlColor = colorFromRGBA(84, 99, 108, 1)
        } else {
            this.legendEl.className = 'legend'
            for (let label in this.legendLines.cross) {
                this.legendLines.cross[label].className = 'line-cross'
            }
            previewBlurColor = colorFromRGBA(229, 243, 247, 0.5)
            previewControlColor = colorFromRGBA(186, 209, 223, 1)
        }
        this.render()
    }

    onMouseMove (e) {
        e.stopPropagation()
        if (this.moveDir !== 'no') {
            this.setMove(e.clientX)
        } else {
            this.moveLegendTo(e.clientX)
        }
    }

    onMouseDown (e) {
        const dir = this.getDir(e.clientX, e.clientY)
        if (dir === 'no') {
            return
        }
        this.setMoveDir(dir, e.clientX)
    }

    onMouseUp (e) {
        this.setNoMove()
        this.onMouseEnter(e)
    }

    onMouseEnter (e) {
        e.stopPropagation()
        this.showLegend()
        this.moveLegendTo(e.clientX)
    }

    onMouseLeave (e) {
        e.stopPropagation()
        this.hideLegend()
    }

    onTouchMove (e) {
        e.stopPropagation()

        const ev = e.targetTouches[0]

        if (this.moveDir !== 'no') {
            this.setMove(ev.clientX)
        } else {
            this.moveLegendTo(ev.clientX)
        }
    }

    onTouchStart (e) {
        e.stopPropagation()

        const ev = e.targetTouches[0]

        const dir = this.getDir(ev.clientX, ev.clientY)
        if (dir === 'no') {
            this.showLegend()
            this.moveLegendTo(ev.clientX)
            return
        }
        this.setMoveDir(dir, ev.clientX)
    }

    onTouchEnd (e) {
        e.stopPropagation()
        this.setNoMove()
        this.hideLegend()
    }
}

function getX (data) {
    for (let column of data.columns) {
        if (data.types[column[0]] === 'x') {
            return column
        }
    }
}

function getLines (data) {
    const result = []
    for (let column of data.columns) {
        if (data.types[column[0]] === 'line') {
            result.push(column)
        }
    }
    return result
}

function approximate (from, to, grade) {

    const val = (from - ( from - to ) * grade)

    return val < 0 ? 0 : val
}

function colorFromRGBA (r, g, b, a) {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

function colorFromHex (hex) {
    return 'rgba('
        + parseInt(hex.slice(1, 3), 16) + ','
        + parseInt(hex.slice(3, 5), 16) + ','
        + parseInt(hex.slice(5), 16) + ','
}

function binarySearch (arr, val, i = 0) {

    const len = arr.length

    let j = len - 1

    while (i < j) {
        const m = (j + i) >>> 1
        const v = arr[m]
        if (v > val) {
            j = m - 1
        } else if (v < val) {
            i = m + 1
        } else {
            return m
        }
    }

    const diff = val - arr[i]

    if (diff > 0) {
        return i < len - 1 && diff > arr[i+1] - val ? i + 1 : i
    } else {
        return i > 0 && diff < arr[i-1] - val ? i - 1 : i
    }
}

export default Canvas
