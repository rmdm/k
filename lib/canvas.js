const stepSize = 0.02
const stepTimeMs = 8

const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ]

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

        this.setSize(options.width, options.height)
        this.setBasicSizes(options.padW, options.padH, options.datesDiff)

        this.currentLeft = options.from
        this.currentRight = options.to

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

        this.el.appendChild(this.canvasEl)

        if (options.decor) {

            this.setFont(options.fontSize, options.fontFamily)

            this.legendEl = document.createElement('div')
            this.legendEl.className = 'legend'

            this.legendTitleEl = document.createElement('div')
            this.legendTitleEl.className = 'legend-title'
            this.legendTitleEl.innerText = 'Sat, Feb 24'
            this.legendEl.appendChild(this.legendTitleEl)

            this.rulerEl = document.createElement('div')
            this.rulerEl.className = 'ruler'
            this.rulerEl.style.height = this.toCssPixels(this.height - this.padH) + 'px'
            this.el.appendChild(this.rulerEl)

            this.legendLines = { els: {}, values: {}, cross: {} }
            for (let label in data.names) {

                const lineEl = this.legendLines.els[label] = document.createElement('div')
                lineEl.className = 'legend-line'

                const lineValEl = this.legendLines.values[label] = document.createElement('div')
                lineValEl.className = 'legend-value'

                const lineLabelEl = document.createElement('div')
                lineLabelEl.className = 'legend-label'
                lineLabelEl.innerText = data.names[label]

                const lineCrossEl = this.legendLines.cross[label] = document.createElement('div')
                lineCrossEl.className = 'line-cross'
                lineCrossEl.style['border-color'] = this.lineColors[label] + '1)'

                this.el.appendChild(lineCrossEl)

                lineEl.appendChild(lineValEl)
                lineEl.appendChild(lineLabelEl)

                lineEl.style.color = this.lineColors[label] + '1)'
                this.legendEl.appendChild(lineEl)
            }

            this.el.appendChild(this.legendEl)

            this.el.addEventListener('mousemove', e => this.onMouseMove(e))
            this.el.addEventListener('mouseleave', () => this.hideLegend())
            this.el.addEventListener('mouseenter', () => this.showLegend())

            this.hideLegend()
        }
    }

    move (left, right) {
        this.animate(left, right)
    }

    moveLeft (left) {
        this.animate(left, this.currentRight)
    }

    moveRight (right) {
        this.animate(this.currentLeft, right)
    }

    disable (label) {
        if (this.lineStates[label]) {
            this.lineStates[label] = false
            this.lineGrades[label] = 1 - this.lineGrades[label]
            this.animate(this.currentLeft, this.currentRight)
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
            this.animate(this.currentLeft, this.currentRight)
            if (this.decor) {
                this.legendLines.els[label].style.display = 'inline-block'
            }
        }
    }

    animate (left, right) {

        if (this.animation) {
            clearInterval(this.animation)
        }

        this.currentLeft = left
        this.currentRight = right

        this.animation = setInterval(() => {

            let heightDone = true, datesDone = true, linesDone = true

            if (this.heightGrade < 1) {
                this.heightGrade += stepSize
                heightDone = false
            } else {
                this.heightGrade = 1
                this.fromHeight = this.toHeight
            }

            if (this.datesGrade < 1) {
                this.datesGrade += stepSize
                datesDone = false
            } else {
                this.datesGrade = 1
                this.fromPeriod = this.toPeriod
            }

            for (const label in this.lineGrades) {
                if (this.lineGrades[label] < 1) {
                    this.lineGrades[label] += stepSize
                    linesDone = false
                } else {
                    this.lineGrades[label] = 1
                }
            }

            if (heightDone && datesDone && linesDone) {
                clearInterval(this.animation)
            }

            this.clear()
            this.render()

        }, stepTimeMs)
    }

    clear () {
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height)
    }

    render () {

        const dX = this.xDiff * (this.currentRight - this.currentLeft)
        let dY = this.getMaxY(this.currentLeft, this.currentRight)

        if (this.toHeight !== dY) {
            this.heightGrade = Math.abs(this.currentHeight - this.fromHeight) / ( Math.abs(this.currentHeight - this.fromHeight) + Math.abs(dY - this.currentHeight) )
            this.toHeight = dY
            this.fromHeight = this.currentHeight
        }

        this.currentHeight = approximate(this.fromHeight, this.toHeight, this.heightGrade, Infinity)

        if (this.decor) {
            this.drawGrid(this.fromHeight, this.toHeight, this.currentHeight, this.heightGrade)
            this.drawDates()
        }

        this.drawLines(this.currentLeft, this.currentRight, dX, this.currentHeight)
    }

    drawGrid (from, to, current, grade) {

        const width = this.canvasEl.width - 2 * this.padW
        const height = this.canvasEl.height - 2 * this.padH

        this.ctx.lineWidth = this.basicThickness
        this.ctx.strokeStyle = 'rgb(240, 240, 240)'

        this.ctx.beginPath()

        this.ctx.lineTo(this.padW, height + this.padH)
        this.ctx.lineTo(this.padW + width, height + this.padH)

        this.ctx.stroke()

        const base = this.padH + height

        let fromValuesDiff = from / 5
        let toValuesDiff = to / 5
        const fromLinesDiff = height / current * fromValuesDiff
        const toLinesDiff = height / current * toValuesDiff

        fromValuesDiff = Math.round(fromValuesDiff)
        toValuesDiff = Math.round(toValuesDiff)

        this.ctx.fillStyle = 'rgba(146, 161, 168, ' + grade + ')'
        this.ctx.strokeStyle = 'rgba(240, 240, 240, ' + grade + ')'
        this.ctx.beginPath()

        for (
            let i = 0, y = base - toLinesDiff, val = toValuesDiff;
            i < 5;
            i++, y -= toLinesDiff, val += toValuesDiff
        ) {
            this.ctx.fillText(val, this.padW, y - this.textSize / 2)
            this.ctx.moveTo(this.padW, y)
            this.ctx.lineTo(this.padW + width, y)
        }

        this.ctx.stroke()

        if (grade < 1) {

            this.ctx.fillStyle = 'rgba(146, 161, 168, ' + (1 - grade) + ')'
            this.ctx.strokeStyle = 'rgba(240, 240, 240, ' + (1 - grade) + ')'
            this.ctx.beginPath()

            for (
                let i = 0, y = base - fromLinesDiff, val = fromValuesDiff;
                i < 5;
                i++, y -= fromLinesDiff, val += fromValuesDiff
            ) {
                this.ctx.fillText(val, this.padW, y - this.textSize / 2)
                this.ctx.moveTo(this.padW, y)
                this.ctx.lineTo(this.padW + width, y)
            }

            this.ctx.stroke()
        }
    }

    drawDates () {

        if (this.currentRight - this.currentLeft <= (1 / this.x.length)) {
            this.fromPeriod = 0
            return
        }

        const width = this.canvasEl.width - 2 * this.padW
        const height = this.canvasEl.height - 2 * this.padH

        if (this.fromPeriod === 0) {
            this.fromPeriod = this.toPeriod =
                this.datesDiff * (this.currentRight - this.currentLeft) / width
        }

        const currentDiff = this.toPeriod * width / (this.currentRight - this.currentLeft)

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

        const scale = width / (this.currentRight - this.currentLeft)
        const y = height + this.padH + 1.5 * this.textSize

        if (this.fromPeriod >= this.toPeriod) {

            let n = Math.floor(this.currentLeft / this.toPeriod) - 1

            if (this.fromPeriod > this.toPeriod) {

                this.ctx.fillStyle = 'rgba(146, 161, 168, ' + this.datesGrade + ')'

                for (let p = this.toPeriod * n; p < this.currentRight + this.toPeriod; p += this.toPeriod) {
                    const d = new Date(Math.floor(this.x[1] + this.xDiff * p))
                    const text = months[d.getMonth()] + ' ' + d.getDate()
                    this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y)
                }
            }

            this.ctx.fillStyle = 'rgb(146, 161, 168)'

            n = Math.floor(this.currentLeft / this.fromPeriod) - 1

            for (let p = this.fromPeriod * n; p < this.currentRight + this.fromPeriod; p += this.fromPeriod) {
                const d = new Date(Math.floor(this.x[1] + this.xDiff * p))
                const text = months[d.getMonth()] + ' ' + d.getDate()
                this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y)
            }

        } else {

            let n = Math.floor(this.currentLeft / this.fromPeriod) - 1

            this.ctx.fillStyle = 'rgba(146, 161, 168, ' + (1 - this.datesGrade) + ')'

            for (let p = this.fromPeriod * n; p < this.currentRight + this.fromPeriod; p += this.fromPeriod) {
                const d = new Date(Math.floor(this.x[1] + this.xDiff * p))
                const text = months[d.getMonth()] + ' ' + d.getDate()
                this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y)
            }

            this.ctx.fillStyle = 'rgb(146, 161, 168)'

            n = Math.floor(this.currentLeft / this.toPeriod) - 1

            for (let p = this.toPeriod * n; p < this.currentRight + this.toPeriod; p += this.toPeriod) {
                const d = new Date(Math.floor(this.x[1] + this.xDiff * p))
                const text = months[d.getMonth()] + ' ' + d.getDate()
                this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y)
            }
        }
    }

    drawLines (left, right, dX, dY) {
        for (let line of this.lines) {
            if (this.lineStates[line[0]] || this.lineGrades[line[0]] < 1) {
                this.drawLine(line, left, right, dX, dY)
            }
        }
    }

    drawLine (line, left, right, dX, dY) {

        const width = this.canvasEl.width - 2 * this.padW
        const height = this.canvasEl.height - 2 * this.padH

        const scaleX = width / dX
        const scaleY = height / dY

        this.ctx.lineWidth = 2 * this.basicThickness
        this.ctx.strokeStyle = this.getStrokeStyle(line)

        this.ctx.beginPath()

        const initialIndex = Math.ceil((line.length - 1) * left) + 1
        const endIndex = Math.floor((line.length - 1) * right)

        let initialX = this.x[initialIndex]
        let initialXCoord = this.padW +
            ((initialX - this.x[1]) / (this.xDiff) - left) * width / (right - left)

        let prevXCoord = initialXCoord, prevX = initialX

        for (let i = initialIndex; i > 0; i--) {

            const x = this.x[i]
            const y = line[i]

            prevXCoord = prevXCoord + (x - prevX) * scaleX
            this.ctx.lineTo(prevXCoord, this.padH + height - y * scaleY)

            prevX = x

            if (prevXCoord < 0) {
                break
            }
        }

        this.ctx.moveTo(initialXCoord, this.padH + height - line[initialIndex] * scaleY)

        for (let i = initialIndex + 1; i < line.length; i++) {

            const x = this.x[i]
            const y = line[i]

            initialXCoord = initialXCoord + (x - initialX) * scaleX
            this.ctx.lineTo(initialXCoord, this.padH + height - y * scaleY)

            initialX = x

            if (initialXCoord > width + this.padW * 2) {
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

    onMouseMove (e) {

        const leftOffset = this.el.getBoundingClientRect().left
        const offsetLeft = this.fromCssPixels(e.clientX - leftOffset)

        this.moveLegendTo(offsetLeft)
    }

    moveLegendTo (offsetLeft) {

        const width = this.canvasEl.width - 2 * this.padW
        const height = this.canvasEl.height - 2 * this.padH

        let position = this.currentLeft + (offsetLeft - this.padW) / width * (this.currentRight - this.currentLeft)

        if (position < this.currentLeft) {
            position = this.currentLeft
        } else if (position > this.currentRight) {
            position = this.currentRight
        }

        const closestIndex = Math.max(Math.round((this.x.length - 1) * position), 1)

        const percent = (this.x[closestIndex] - this.x[1]) / this.xDiff

        const d = new Date(Math.floor(this.x[1] + this.xDiff * percent))
        const text = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate()

        const xPos = this.padW + (percent - this.currentLeft) / (this.currentRight - this.currentLeft) * width

        const leftOffset = this.toCssPixels(xPos)

        const legendOffsetWidth = this.legendEl.offsetWidth

        let additionalOffset = 0

        for (const line of this.lines) {
            if (this.lineStates[line[0]]) {

                const value = line[closestIndex]

                const topOffset = this.toCssPixels(this.padH + height - value / this.currentHeight * height)

                this.legendLines.values[line[0]].innerText = value
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

        const rightOverflow = nextOffset + legendOffsetWidth - this.toCssPixels(width + this.padW)

        if (rightOverflow > 0) {
            additionalOffset = additionalOffset ? -additionalOffset : -legendOffsetWidth / 2 - 10
        }

        this.rulerEl.style.left = leftOffset + 'px'
        this.legendEl.style.left = leftOffset - legendOffsetWidth / 2 + additionalOffset + 'px'

        this.legendTitleEl.innerText = text
    }

    getMaxY (left, right) {

        let max = 0

        for (const line of this.lines) {

            if (!this.lineStates[line[0]]) {
                continue
            }

            const from = Math.ceil((line.length - 1) * left) + 1
            const to = Math.ceil((line.length - 1) * right)

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
            ? this.lineColors[label] + this.lineGrades[label] + ')'
            : this.lineColors[label] + (1 - this.lineGrades[label]) + ')'
    }

    setSize (width, height) {

        const ratio = getPixelRatio()

        this.width = width * ratio
        this.canvasEl.width = width * ratio
        this.canvasEl.style.width = width + 'px'

        this.height = height * ratio
        this.canvasEl.height = height * ratio
        this.canvasEl.style.height = height + 'px'
    }

    setFont (size, family) {
        const ratio = getPixelRatio()
        this.textSize = size * ratio
        this.ctx.font = ratio * size + 'px ' + family
    }

    setBasicSizes (padW, padH, datesDiff) {

        const ratio = getPixelRatio()

        this.padW = padW * ratio
        this.padH = padH * ratio
        this.datesDiff = datesDiff * ratio
        this.basicThickness = ratio
    }

    toCssPixels (value) {

        const ratio = getPixelRatio()

        return value / ratio
    }

    fromCssPixels (value) {

        const ratio = getPixelRatio()

        return value * ratio
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

function toRGBA (hex) {
    return 'rgba('
        + parseInt(hex.slice(1, 3), 16) + ','
        + parseInt(hex.slice(3, 5), 16) + ','
        + parseInt(hex.slice(5), 16) + ','
}

function getPixelRatio () {
    return window.devicePixelRatio || 1
}

export default Canvas
