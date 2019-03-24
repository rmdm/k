const animationDurationMs = 250
const dateOffset = 18

const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ]

const getAxisColor = function (alpha) {
    return getColor(100, 130, 140, 0.7 * alpha)
}

const getMeshColor = function (alpha) {
    return getColor(155, 180, 190, 0.2 * alpha)
}

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

        this.setBasicSizes(options.padW, options.padH, options.datesDiff, options.lineWidth)
        this.setSize(options.width, options.height)

        this.currentLeft = options.from
        this.currentRight = options.to
        this.currentRange = options.to - options.from

        this.xDiff = this.x[this.x.length - 1] - this.x[1]

        this.lineStates = {}
        this.lineGrades = {}
        this.lineColors = {}
        for (let label in data.names) {
            this.lineStates[label] = true
            this.lineGrades[label] = 1
            this.lineColors[label] = toRGBA(data.colors[label])
        }

        this.fromHeight = this.toHeight = this.currentHeight =
            this.getMaxY(options.from, options.to)
        this.heightGrade = 1

        this.fromPeriod = this.toPeriod = 0
        this.datesGrade = 1

        this.prevMs = undefined

        this.el.appendChild(this.canvasEl)

        if (options.decor) {

            this.setFont(options.fontSize, options.fontFamily)

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

            this.el.addEventListener('touchmove', e => this.onTouchMove(e))
            this.el.addEventListener('touchstart', e => this.onTouchStart(e))
            this.el.addEventListener('touchend', e => this.onTouchEnd(e))

            this.hideLegend()
        }
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

            this.clear()
            this.render()
        }

        this.animation = requestAnimationFrame(step)
    }

    clear () {
        this.ctx.clearRect(0, 0, this.width, this.height)
    }

    render () {

        const dX = this.xDiff * (this.currentRange)
        let dY = this.getMaxY(this.currentLeft, this.currentRight)

        if (this.toHeight !== dY) {
            this.fromHeight = this.currentHeight
            this.heightGrade = 0
            this.toHeight = dY
        }

        this.currentHeight = approximate(this.fromHeight, this.toHeight, this.heightGrade, Infinity)

        if (this.decor) {
            this.drawGrid(this.fromHeight, this.toHeight, this.currentHeight, this.heightGrade)
            this.drawDates()
        }

        this.drawLines(this.currentLeft, this.currentRight, dX, this.currentHeight)
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
        this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale - fromCssSize(dateOffset), y)
    }

    drawLines (left, right, dX, dY) {
        for (let line of this.lines) {
            if (this.lineStates[line[0]] || this.lineGrades[line[0]] < 1) {
                this.drawLine(line, left, right, dX, dY)
            }
        }
    }

    drawLine (line, left, right, dX, dY) {

        const scaleX = this.chartWidth / dX
        const scaleY = this.chartHeight / dY

        this.ctx.lineWidth = fromCssSize(this.lineWidth)
        this.ctx.strokeStyle = this.getStrokeStyle(line)

        const initialIndex = this.getLowerIndex(left - this.padW / this.chartWidth)

        let prevX = this.x[initialIndex]
        let prevXCoord = this.padW +
            ((prevX - this.x[1]) / (this.xDiff) - left) * this.chartWidth / (right - left)

        const zeroH = this.padH + this.chartHeight

        this.ctx.beginPath()
        this.ctx.moveTo(prevXCoord, zeroH - line[initialIndex] * scaleY)

        for (let i = initialIndex + 1; i < line.length; i++) {

            const x = this.x[i]
            const y = line[i]

            const yCoord = zeroH - y * scaleY

            prevXCoord = prevXCoord + (x - prevX) * scaleX

            // it is faster here to write every segment separately
            this.ctx.lineTo(prevXCoord, yCoord)
            this.ctx.stroke()
            this.ctx.beginPath()
            this.ctx.moveTo(prevXCoord, yCoord)

            prevX = x

            if (prevXCoord > this.width) {
                break
            }
        }

        this.ctx.stroke()
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

    setSize (width, height, resize) {

        const ratio = getPixelRatio()

        this.width = width * ratio
        this.canvasEl.width = width * ratio
        this.canvasEl.style.width = width + 'px'

        this.height = height * ratio
        this.canvasEl.height = height * ratio
        this.canvasEl.style.height = height + 'px'

        this.chartWidth = this.width - 2 * this.padW
        this.chartHeight = this.height - 2 * this.padH

        if (this.decor && resize) {
            this.setFont(toCssSize(this.textSize), this.textFamily)
        }
    }

    setFont (size, family) {
        this.textSize = fromCssSize(size)
        this.textFamily = family
        this.ctx.font = this.textSize + 'px ' + family
    }

    setBasicSizes (padW, padH, datesDiff, lineWidth) {

        const ratio = getPixelRatio()

        this.padW = padW * ratio
        this.padH = padH * ratio
        this.datesDiff = datesDiff * ratio
        this.lineWidth = lineWidth
    }

    getLowerIndex (procent) {

        const upperIndex = this.getUpperIndex(procent)

        return Math.max(upperIndex - 1, 1)
    }

    getUpperIndex (procent) {
        return binarySearch(this.x, this.x[1] + this.xDiff * procent, 1)
    }

    getClosestIndex (procent) {

        const val = this.x[1] + this.xDiff * procent

        const upperIndex = binarySearch(this.x, val, 1)
        const lowerIndex = Math.max(upperIndex - 1, 1)

        const lowerVal = this.x[lowerIndex]
        const upperVal = this.x[upperIndex]

        return val - lowerVal < upperVal - val ? lowerIndex : upperIndex
    }

    getLineColor (line, alpha) {
        return this.lineColors[line] + alpha + ')'
    }

    nightMode (enable) {
        if (enable) {
            this.legendEl.className = 'legend night'
            for (let label in this.legendLines.cross) {
                this.legendLines.cross[label].className = 'line-cross night'
            }
        } else {
            this.legendEl.className = 'legend'
            for (let label in this.legendLines.cross) {
                this.legendLines.cross[label].className = 'line-cross'
            }
        }
    }

    onMouseMove (e) {
        e.stopPropagation()
        this.moveLegendTo(e.clientX)
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
        this.moveLegendTo(e.targetTouches[0].clientX)
    }

    onTouchStart (e) {
        e.stopPropagation()
        this.showLegend()
        this.moveLegendTo(e.targetTouches[0].clientX)
    }

    onTouchEnd (e) {
        e.stopPropagation()
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

function approximate (from, to, grade, max) {

    const val = (from - ( from - to ) * grade)

    return val < 0
        ? 0
        : val > max ? max : val
}

function getColor (r, g, b, a) {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

function toRGBA (hex) {
    return 'rgba('
        + parseInt(hex.slice(1, 3), 16) + ','
        + parseInt(hex.slice(3, 5), 16) + ','
        + parseInt(hex.slice(5), 16) + ','
}

function getPixelRatio () {
    return window.devicePixelRatio || 1
}

function toCssSize (value) {

    const ratio = getPixelRatio()

    return value / ratio
}

function fromCssSize (value) {

    const ratio = getPixelRatio()

    return value * ratio
}

function binarySearch (arr, val, i = 0) {

    const len = arr.length

    let j = len - 1

    while (i <= j) {
        if (i === j) {
            return i
        } else {
            const m = (j + i) >>> 1
            const v = arr[m]
            if (v > val) {
                j = m - 1
            } else if (v < val) {
                i = m + 1
            } else {
                return i
            }
        }
    }

    return i
}

export default Canvas
