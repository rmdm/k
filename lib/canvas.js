const PADDING = 10
const stepSize = 0.02
const stepTimeMs = 10

class Canvas {

    constructor (data, options) {

        this.data = data

        this.padH = options.padH
        this.padW = options.padW
        this.decor = options.decor

        this.x = getX(data)
        this.lines = getLines(data)
        this.el = document.createElement('canvas')
        this.ctx = this.el.getContext('2d')

        this.el.width = options.width
        this.el.height = options.height

        this.xDiff = this.x[this.x.length - 1] - this.x[1]

        this.fromLeft = this.toLeft = this.currentLeft = options.from
        this.fromRight = this.toRight = this.currentRight = options.to

        this.lineStates = {}
        this.lineGrades = {}
        this.colors = {}
        for (let label in data.names) {
            this.lineStates[label] = true
            this.lineGrades[label] = 1
            this.colors[label] = toRGBA(data.colors[label])
        }

        this.fromHeight = this.toHeight = this.currentHeight = this.getMaxY(options.from, options.to)

        this.xGrade = { left: 1, right: 1, height: 1 }
    }

    move (left, right) {
        this.animate(left, right)
    }

    moveLeft (left) {
        this.animate(left, this.toRight)
    }

    moveRight (right) {
        this.animate(this.toLeft, right)
    }

    disable (label) {
        if (this.lineStates[label]) {
            this.lineStates[label] = false
            this.lineGrades[label] = 1 - this.lineGrades[label]
            this.animate(this.toLeft, this.toRight)
        }
    }

    enable (label) {
        if (!this.lineStates[label]) {
            this.lineStates[label] = true
            this.lineGrades[label] = 1 - this.lineGrades[label]
            this.animate(this.toLeft, this.toRight)
        }
    }

    animate (left, right) {

        if (this.animation) {
            clearInterval(this.animation)
        }

        this.xGrade.left = 1
        this.xGrade.right = 1
        this.xGrade.height = 0
        this.toLeft = left
        this.toRight = right
        this.fromLeft = this.currentLeft
        this.fromRight = this.currentRight

        this.animation = setInterval(() => {

            if (
                this.xGrade.left >= 1
                && this.xGrade.right >= 1
                && this.xGrade.height >= 1
            ) {

                this.xGrade.left = 1
                this.xGrade.right = 1
                this.xGrade.height = 1
                this.fromLeft = this.toLeft
                this.fromRight = this.toRight
                this.fromHeight = this.toHeight
                clearInterval(this.animation)

            } else {

                if (this.xGrade.left < 1) {
                    this.xGrade.left += stepSize
                } else {
                    this.xGrade.left = 1
                }

                if (this.xGrade.right < 1) {
                    this.xGrade.right += stepSize
                } else {
                    this.xGrade.right = 1
                }

                if (this.xGrade.height < 1) {
                    this.xGrade.height += stepSize
                } else {
                    this.xGrade.height = 1
                }

                for (const label in this.lineGrades) {
                    if (this.lineGrades[label] < 1) {
                        this.lineGrades[label] += stepSize
                    } else {
                        this.lineGrades[label] = 1
                    }
                }
            }

            this.clear()
            this.render()

        }, stepTimeMs)
    }

    clear () {
        this.ctx.clearRect(0, 0, this.el.width, this.el.height)
    }

    render () {

        this.ctx.translate(0.5, 0.5)

        this.currentLeft = approximate(this.fromLeft, this.toLeft, this.xGrade.left, 1)
        this.currentRight = approximate(this.fromRight, this.toRight, this.xGrade.right, 1)

        const dX = this.xDiff * (this.currentRight - this.currentLeft)
        let dY = this.getMaxY(this.currentLeft, this.currentRight)

        if (this.toHeight !== dY) {
            this.toHeight = dY
            this.fromHeight = this.currentHeight
            this.xGrade.height = 0
        }

        this.currentHeight = approximate(this.fromHeight, this.toHeight, this.xGrade.height, Infinity)

        if (this.decor) {
            this.drawGrid(this.fromHeight, this.toHeight, this.currentHeight, this.xGrade.height)
            this.drawDates(this.currentLeft, this.currentRight)
        }
        this.drawLines(this.currentLeft, this.currentRight, dX, this.currentHeight)

        this.ctx.translate(-0.5, -0.5)
    }

    drawGrid (from, to, current, grade) {

        const width = this.el.width - 2 * this.padW
        const height = this.el.height - 2 * this.padH

        this.ctx.lineWidth = 1
        this.ctx.strokeStyle = 'rgb(200, 200, 200)'

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

        this.ctx.font = '10px sans serif'

        this.ctx.fillStyle = this.ctx.strokeStyle = 'rgba(200, 200, 200, ' + grade + ')'
        this.ctx.beginPath()

        for (
            let i = 0, y = base - toLinesDiff, val = toValuesDiff;
            i < 5;
            i++, y -= toLinesDiff, val += toValuesDiff
        ) {
            this.ctx.fillText(val, this.padW, y - 4)
            this.ctx.moveTo(this.padW, y)
            this.ctx.lineTo(this.padW + width, y)
        }

        this.ctx.stroke()

        if (grade < 1) {

            this.ctx.fillStyle = this.ctx.strokeStyle = 'rgba(200, 200, 200, ' + (1 - grade) + ')'
            this.ctx.beginPath()

            for (
                let i = 0, y = base - fromLinesDiff, val = fromValuesDiff;
                i < 5;
                i++, y -= fromLinesDiff, val += fromValuesDiff
            ) {
                this.ctx.fillText(val, this.padW, y - 4)
                this.ctx.moveTo(this.padW, y)
                this.ctx.lineTo(this.padW + width, y)
            }

            this.ctx.stroke()
        }
    }

    drawDates (fromLeft, toLeft, fromRight, toRight, grade) {

    }

    drawLines (left, right, dX, dY) {
        for (let line of this.lines) {
            if (this.lineStates[line[0]] || this.lineGrades[line[0]] < 1) {
                this.drawLine(line, left, right, dX, dY)
            }
        }
    }

    drawLine (line, left, right, dX, dY) {

        const width = this.el.width - 2 * this.padW
        const height = this.el.height - 2 * this.padH

        const scaleX = width / dX
        const scaleY = height / dY

        this.ctx.lineWidth = 2
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

        return this.lineStates[line[0]]
            ? this.colors[line[0]] + this.lineGrades[line[0]] + ')'
            : this.colors[line[0]] + ( 1- this.lineGrades[line[0]] ) + ')'
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
        : val > max
            ? max
            : val
}

function toRGBA (hex) {
    return 'rgba('
        + parseInt(hex.slice(1, 3), 16) + ','
        + parseInt(hex.slice(3, 5), 16) + ','
        + parseInt(hex.slice(5), 16) + ','
}

export default Canvas
