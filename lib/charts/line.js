import AnimatableChart from '../animatable_chart'
import {

    controlWidth,
    previewPadding,
    calcYAlignment,

    animatableAlphaHEXcolor,
    animatableHexColor,
    dynamicHexColor,

    fromCssSize,
    toCssSize,
    getMaxY,
    getMinY,
    getClosestIndex,
    getLowerIndex,
    getUpperIndex,
    drawLines,
    drawScrollControlls,
    drawGrid,
    drawTranslateYLabels,
    drawDates,
    drawCheckboxes,
    drawLinesLegend,
    drawHeader,
    drawZoomOutControl,
    drawDateRangeSummary,
} from '../draw-tools'

const animationDurationMs = 250

const getGridColor = animatableHexColor('#182D3B', 0.1, '#FFFFFF', 0.1)
const getAxisColor = animatableHexColor('#8E8E93', 1, '#A3B1C2', 0.6)
const getRullerColor = animatableHexColor('#182D3B', 0.1, '#FFFFFF', 0.1)
const getLegendBorderColor = animatableAlphaHEXcolor('#1E1E1E', 0.2)
const getLegendFontColor = animatableHexColor('#000000', 1, '#FFFFFF', 1)
const getLegendColor = animatableHexColor('#FFFFFF', 1, '#1F2A35', 1)
const getBackgroundColor = animatableHexColor('#FFFFFF', 1, '#26333F', 1)
const getPreviewBlurColor = animatableHexColor('#E2EEF9', 0.6, '#304259', 0.6)
const getPreviewControlColor = animatableHexColor('#C0D1E1', 1, '#56626D', 1)
const getZoomOutColor = animatableHexColor('#108BE3', 1, '#48AAF0', 1)

export default class LineChart extends AnimatableChart {

    constructor (data, options) {
        super(options)

        this.headerText = options.header

        this.details = data.details

        data = data.overview

        this.x = getX(data)
        this.lines = getLines(data)

        this.xDiff = this.x[this.x.length - 1] - this.x[1]
        this.lineStates = {}
        this.lineGrades = {}
        this.lineColors = {}
        this.lineLabels = data.names
        this.checkboxes = []
        this.checkboxLabelToIndex = {}
        let i = 0
        for (let label in data.names) {
            this.lineStates[label] = true
            this.lineGrades[label] = 1
            this.lineColors[label] = animatableAlphaHEXcolor(data.colors[label], 1)
            this.checkboxLabelToIndex[label] = i++
            this.checkboxes.push({
                id: label,
                label: data.names[label],
                getColor: dynamicHexColor(data.colors[label], 1, '#FFFFFF', 1, '#26333F', 1),
                grade: 1,
                x: 0,
                y: 0,
                toX: 0,
                toY: 0,
            })
        }

        this.currentLeft = this.scrollLeft = options.from
        this.currentRight = this.scrollRight = options.to
        this.currentRange = options.to - options.from

        this.currentMaxHeight = this.fromMaxHeight = this.toMaxHeight =
            getMaxY(this.x, this.lines, this.lineStates, this.currentLeft, this.currentRight)
        this.maxHeight = getMaxY(this.x, this.lines, this.lineStates, 0, 1)

        this.currentMinHeight = this.fromMinHeight = this.toMinHeight =
            getMinY(this.x, this.lines, this.lineStates, this.currentLeft, this.currentRight)
        this.minHeight = getMinY(this.x, this.lines, this.lineStates, 0, 1)

        this.fromPeriod = this.toPeriod = 0
        this.datesGrade = 1

        this.moveDir = 'no'

        this.legendShown = false
        this.legendMoving = false
        this.legendPosition = 0
        this.pickedIndex = 0
        this.legendCoordinates = {}

        this.nightGrade = 0

        this.zoomFromGrade = 1
        this.zoomToGrade = 0
        this.zoomedIndex = -1
        this.zoomedData = null
        this.ref = this
        this.zoomState = 'overview'
        this.zoomOutCoords = {}

        this.yAlign = { top: 0, bottom: 0 }

        this.el.addEventListener('mousedown', e => this.onMouseDown(e))
        this.el.addEventListener('mousemove', e => this.onMouseMove(e))
        this.el.addEventListener('mouseup', e => this.onMouseUp(e))
        this.el.addEventListener('mouseleave', e => this.onMouseLeave(e))

        this.el.addEventListener('touchstart', e => this.onTouchStart(e))
        this.el.addEventListener('touchmove', e => this.onTouchMove(e))
        this.el.addEventListener('touchend', e => this.onTouchEnd(e))
    }

    setSize (options) {

        this.setBasicSizes(options)
        this.setWidth(options.width)

        const previewOffsetH = options.headerHeight + options.height + options.fontSize * 2
        const checkboxesOffsetH = previewOffsetH + options.previewHeight + options.padH
        const height = checkboxesOffsetH + options.checkboxesAreaHeight

        this.height = fromCssSize(height)
        this.canvasEl.height = fromCssSize(height)
        this.canvasEl.style.height = height + 'px'

        this.chartHeight = fromCssSize(options.height - 2 * options.padH)
        this.mainLinesOffsetH = this.headerHeight + this.padH
        this.datesOffsetH = this.headerHeight + this.chartHeight + this.padH + 1.5 * this.textSize
        this.previewOffsetH = fromCssSize(previewOffsetH)
        this.checkboxesOffsetH = fromCssSize(checkboxesOffsetH)
    }

    setWidth (width, resize) {

        this.width = fromCssSize(width)
        this.canvasEl.width = this.width
        this.canvasEl.style.width = width + 'px'

        this.chartWidth = this.width - 2 * this.padW

        this.ctx.font = this.ctxFont
        this.ctx.lineJoin = 'bevel'

        if (resize) {
            this.render()
        }
    }

    setBasicSizes (options) {
        this.padW = fromCssSize(options.padW)
        this.padH = fromCssSize(options.padH)
        this.datesDiff = fromCssSize(options.datesDiff)
        this.previewPadW = fromCssSize(options.previewPadW)
        this.previewPadH = fromCssSize(options.previewPadH)
        this.previewHeight = fromCssSize(options.previewHeight)
        this.checkboxHeight = fromCssSize(options.checkboxHeight)
        this.checkboxRadius = fromCssSize(options.checkboxRadius)
        this.checkboxMargin = fromCssSize(options.checkboxMargin)
        this.lineWidth = fromCssSize(options.lineWidth)
        this.rullerWidth = fromCssSize(options.rullerWidth)
        this.previewLineWidth = fromCssSize(options.previewLineWidth)
        this.gridLineWidth = fromCssSize(options.gridLineWidth)
        this.legendTextSize = fromCssSize(options.legendFontSize)
        this.headerFontSize = fromCssSize(options.headerFontSize)
        this.dateRangeFontSize = fromCssSize(options.dateRangeFontSize)
        this.headerHeight = fromCssSize(options.headerHeight)
    }

    move (ref, left, right) {
        ref.currentLeft = left
        ref.currentRight = right
        ref.currentRange = right - left
        this.animate()
    }

    toggle (label) {
        this.lineStates[label] = !this.lineStates[label]
        const to = +this.lineStates[label]
        this.addAnimation(this.lineGrades, label, to, animationDurationMs)
        this.addAnimation(this.checkboxes[this.checkboxLabelToIndex[label]], 'grade', to, animationDurationMs, 'checkbox_' + label)
        this.animate()
    }

    zoom (index, direction) {

        if (direction) {
            this.addAnimation(this, 'zoomFromGrade', 0, animationDurationMs)
            if (index !== this.zoomedIndex) {
                this.zoomedData = this.getDetails(index)
                this.zoomedIndex = index
            }
            this.ref = this.zoomedData
            this.addAnimation(this, 'zoomToGrade', 1, animationDurationMs)
            this.zoomState = 'details'
        } else {
            this.ref = this
            this.addAnimation(this, 'zoomFromGrade', 1, animationDurationMs)
            this.addAnimation(this, 'zoomToGrade', 0, animationDurationMs)
            this.zoomState = 'overview'
        }

        this.animate()
    }

    render () {

        this.ctx.clearRect(0, 0, this.width, this.height)

        if (this.zoomFromGrade > 0) {
            this.calc(this)

            drawHeader(this.ctx, this.padW, 0, this.headerHeight, this.headerFontSize, this.textFont, this.headerText, getLegendFontColor, this.nightGrade, this.zoomFromGrade)
            drawDateRangeSummary(this.ctx, this.padW, 0, this.chartWidth, this.headerHeight, this.headerFontSize, this.x[1], this.xDiff, this.currentLeft, this.currentRight, true, this.dateRangeFontSize, this.textFont, getLegendFontColor, this.nightGrade, this.zoomFromGrade)

            this.drawLineChart(this.x, this.lines, this.fromMaxHeight, this.toMaxHeight, this.currentMaxHeight,
                this.fromMinHeight, this.toMinHeight, this.currentMinHeight, this.maxHeight, this.minHeight,
                this.currentLeft, this.currentRight, this.currentRange, this.xDiff,
                this.legendShown, this.legendPosition, this.pickedIndex, this.legendCoordinates,
                false, 'monthdate', 'shortweekdate', this.yAlign, this.zoomFromGrade)
        }

        if (this.zoomToGrade > 0) {
            const details = this.zoomedData
            this.calc(details)

            drawZoomOutControl(this.ctx, this.padW, 0, this.headerHeight, this.headerFontSize, this.textFont, getZoomOutColor, this.nightGrade, this.zoomToGrade, this.zoomOutCoords)
            drawDateRangeSummary(this.ctx, this.padW, 0, this.chartWidth, this.headerHeight, this.headerFontSize, details.x[1], details.xDiff, details.currentLeft, details.currentRight, false, this.dateRangeFontSize, this.textFont, getLegendFontColor, this.nightGrade, this.zoomToGrade)

            this.drawLineChart(details.x, details.lines, details.fromMaxHeight, details.toMaxHeight, details.currentMaxHeight,
                details.fromMinHeight, details.toMinHeight, details.currentMinHeight, details.maxHeight, details.minHeight,
                details.currentLeft, details.currentRight, details.currentRange, details.xDiff,
                details.legendShown, details.legendPosition, details.pickedIndex, details.legendCoordinates,
                true, 'hours', 'hours', details.yAlign, this.zoomToGrade)
        }

        // redraw only if checked
        drawCheckboxes(this.ctx, this.padW, this.checkboxesOffsetH, this.chartWidth,
            this.checkboxes, this.checkboxHeight, this.checkboxRadius, this.checkboxMargin, this.textFont, this.nightGrade)
    }

    drawLineChart (x, lines, fromMaxHeight, toMaxHeight, currentMaxHeight,
        fromMinHeight, toMinHeight, currentMinHeight, maxHeight, minHeight,
        currentLeft, currentRight, currentRange, xDiff,
        legendShown, legendPosition, pickedIndex, legendCoordinates,
        shrink, yAxisdateFormat, legendDateFormat, yAlign, zoomGrade) {

        drawGrid(this.ctx, this.padW, this.headerHeight, this.chartWidth, this.chartHeight + this.padH, 5,
            fromMaxHeight, toMaxHeight, currentMaxHeight,
            fromMinHeight, toMinHeight, currentMinHeight,
            yAlign.max, yAlign.min, yAlign.top, yAlign.bottom,
            getGridColor, getAxisColor, false, this.gridLineWidth, this.textSize, this.nightGrade, zoomGrade)

        // drawYValues()

        // drawGrid(this.ctx, this.padW, this.headerHeight, this.padH, 0, this.chartWidth, this.chartHeight, 5,
        //     fromMaxHeight, toMaxHeight, currentMaxHeight,
        //     fromMinHeight, toMinHeight, currentMinHeight,
        //     getGridColor, getAxisColor, this.gridLineWidth, this.textSize, this.nightGrade, zoomGrade)

        drawLines(this.ctx, x, lines, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.chartHeight + this.padH - yAlign.top, this.padW, this.headerHeight + yAlign.top, yAlign.bottom,
            currentLeft, currentRight, xDiff * currentRange, currentMaxHeight, currentMinHeight, this.lineWidth, zoomGrade, shrink)

        // redraw only if moving
        drawDates(this.ctx, this.padW, this.datesOffsetH,
            this.chartWidth / currentRange, x[1], xDiff, yAxisdateFormat, currentLeft, currentRight,
            this.fromPeriod, this.toPeriod, this.datesGrade, getAxisColor, this.nightGrade, zoomGrade)

        drawLines(this.ctx, x, lines, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.previewHeight, this.padW, this.previewOffsetH, 0,
            0, 1, xDiff, maxHeight, minHeight, this.previewLineWidth, zoomGrade, shrink)

        // redraw only if moving or checked
        drawScrollControlls(this.ctx, this.padW, this.previewOffsetH, this.chartWidth, this.previewHeight,
            currentLeft, currentRight, getPreviewBlurColor, getPreviewControlColor, this.nightGrade, zoomGrade)

        if (legendShown && (zoomGrade < 1 || (legendPosition >= currentLeft && legendPosition <= currentRight))) {
            drawLinesLegend(this.ctx, x, lines, this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth, this.rullerWidth,
                legendPosition, pickedIndex, this.padW, this.headerHeight, yAlign.top, yAlign.bottom, this.chartWidth, this.chartHeight + this.padH,
                currentLeft, currentRight, currentRange, currentMaxHeight, currentMinHeight, xDiff,
                this.legendTextSize, this.textFont, getRullerColor, getLegendColor, getLegendBorderColor, getLegendFontColor, getBackgroundColor,
                zoomGrade, this.nightGrade, legendCoordinates, zoomGrade, legendDateFormat, this.zoomState === 'overview')
        }
    }

    calc (ref) {
        this.calcHeight(ref)
        this.calcDates(ref)
        this.calcYAlignment(ref)
    }

    calcYAlignment(ref) {

        const chartHeight = this.chartHeight + this.padH
        const linesDiff = chartHeight / 6

        calcYAlignment(ref.toMaxHeight, ref.toMinHeight,
            chartHeight - this.padH, this.padH, chartHeight - linesDiff, linesDiff, chartHeight, ref.yAlign)
    }

    calcHeight (ref) {

        const visibleMaxHeight = getMaxY(ref.x, ref.lines, ref.lineStates, ref.currentLeft, ref.currentRight)

        if (visibleMaxHeight !== ref.toMaxHeight) {
            const uniqName = this.zoomState + 'currentMaxHeight'
            this.addAnimation(ref, 'currentMaxHeight', visibleMaxHeight, animationDurationMs, uniqName)
            this.animate()
        }

        const visibleMinHeight = getMinY(ref.x, ref.lines, ref.lineStates, ref.currentLeft, ref.currentRight)

        if (visibleMinHeight !== ref.toMinHeight) {
            const uniqName = this.zoomState + 'currentMinHeight'
            this.addAnimation(ref, 'currentMinHeight', visibleMinHeight, animationDurationMs, uniqName)
            this.animate()
        }

        const maxAnim = this.animations[this.zoomState + 'currentMaxHeight']

        if (maxAnim) {
            ref.fromMaxHeight = maxAnim.from
            ref.toMaxHeight = maxAnim.to
        }

        const minAnim = this.animations[this.zoomState + 'currentMinHeight']

        if (minAnim) {
            ref.fromMinHeight = minAnim.from
            ref.toMinHeight = minAnim.to
        }
    }

    calcDates (ref) {

        if (ref.currentRange < (1 / ref.x.length)) {
            ref.fromPeriod = 0
            return
        }

        if (ref.fromPeriod === 0) {
            ref.fromPeriod = ref.toPeriod =
                this.datesDiff * (ref.currentRange) / this.chartWidth
        }

        const currentDiff = ref.toPeriod * this.chartWidth / ref.currentRange

        if (currentDiff >= 2 * this.datesDiff) {
            const uniqName = this.zoomState + 'datesGrade'
            ref.fromPeriod = ref.toPeriod
            ref.toPeriod = ref.toPeriod / 2
            ref.datesGrade = 0
            this.addAnimation(ref, 'datesGrade', 1, animationDurationMs, uniqName)
            this.animate()
        } else if (currentDiff < this.datesDiff) {
            const uniqName = this.zoomState + 'datesGrade'
            ref.fromPeriod = ref.toPeriod
            ref.toPeriod = ref.toPeriod * 2
            this.datesGrade = 0
            this.addAnimation(ref, 'datesGrade', 1, animationDurationMs, uniqName)
            this.animate()
        }
    }

    getDetails (index) {

        let fromLeft = index - 3
        let toRight = index + 3

        if (fromLeft < 1) {
            toRight += 1 - fromLeft
            fromLeft = 1
        } else if (toRight >= this.x.length) {
            fromLeft -= toRight - this.x.length + 1
            toRight = this.x.length - 1
        }

        const columns = [], lineIdToIndexMap = {}

        for (let i = fromLeft; i <= toRight; i++) {
            const timestamp = this.x[i]
            const details = this.details[timestamp]
            for (const column of details.columns) {
                if (lineIdToIndexMap[column[0]] === undefined) {
                    lineIdToIndexMap[column[0]] = columns.length
                    columns.push(column.slice())
                } else {
                    let k = column.length
                    const to = columns[lineIdToIndexMap[column[0]]]
                    const offset = to.length - 1
                    while (k-- > 1) {
                        to[offset + k] = column[k]
                    }
                }
            }
        }

        let scrollLeft, scrollRight
        const currentLeft = scrollLeft = (index - fromLeft) / 7
        const currentRight = scrollRight = currentLeft + 1 / 7
        const currentRange = currentRight - currentLeft

        const data = { columns, types: this.details[this.x[1]].types }
        const x = getX(data)
        const lines = getLines(data)
        const rangeMaxHeight = getMaxY(x, lines, this.lineStates, currentLeft, currentRight)
        const rangeMinHeight = getMinY(x, lines, this.lineStates, currentLeft, currentRight)

        const maxHeight = getMaxY(x, lines, this.lineStates, 0, 1)
        const minHeight = getMinY(x, lines, this.lineStates, 0, 1)

        let fromMaxHeight, toMaxHeight, currentMaxHeight,
            fromMinHeight, toMinHeight, currentMinHeight

        fromMaxHeight = toMaxHeight = currentMaxHeight = rangeMaxHeight
        fromMinHeight = toMinHeight = currentMinHeight = rangeMinHeight

        const xDiff = x[x.length - 1] - x[1]

        return {
            x,
            lines,
            maxHeight, minHeight,
            fromMaxHeight, toMaxHeight, currentMaxHeight,
            fromMinHeight, toMinHeight, currentMinHeight,
            currentLeft, currentRight, currentRange,
            xDiff,

            lineStates: this.lineStates,
            fromPeriod: 0,
            toPeriod: 0,
            datesGrade: 1,

            moveDir: 'no',
            scrollStart: 0,
            scrollLeft, scrollRight,

            legendShown: false,
            legendMoving: false,
            legendCoordinates: {},
            pickedIndex: -1,
            legendPosition: 0,
            yAlign: {},
        }
    }

    setNoMove (ref) {
        ref.moveDir = 'no'
        ref.scrollLeft = ref.currentLeft
        ref.scrollRight = ref.currentRight
    }

    setMoveDir (ref, dir, position) {
        ref.moveDir = dir
        ref.scrollStart = position
        ref.scrollLeft = ref.currentLeft
        ref.scrollRight = ref.currentRight
    }

    setMove (ref, movePosition) {

        if (ref.moveDir === 'no') {
            return
        }

        let from = ref.scrollLeft, to = ref.scrollRight

        const offsetDiff = fromCssSize(movePosition - ref.scrollStart)
        const dOffset = offsetDiff / this.chartWidth
        const bound = 2 * controlWidth / this.chartWidth

        if (ref.moveDir === 'left') {
            from += dOffset
            if (from + bound > to) {
                from = to - bound
            }
            if (from < 0) {
                from = 0
            }
        } else if (ref.moveDir === 'right') {
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

        this.move(ref, from, to)
    }

    getDir (ref, x, y) {

        const border = this.canvasEl.getBoundingClientRect()

        const canvasX = fromCssSize(x - border.left)
        const canvasY = fromCssSize(y - border.top)

        const fromW = this.padW + ref.currentLeft * this.chartWidth - controlWidth
        const toW = this.padW + ref.currentRight * this.chartWidth + controlWidth
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

    getLabel (x, y) {

        const border = this.canvasEl.getBoundingClientRect()

        const canvasX = fromCssSize(x - border.left)
        const canvasY = fromCssSize(y - border.top)

        if (canvasY < this.checkboxesOffsetH) {
            return
        }
        for (const c of this.checkboxes) {
            if (c.x <= canvasX && c.toX >= canvasX && c.y <= canvasY && c.toY >= canvasY ) {
                return c.id
            }
        }

        return
    }

    setScroll (ref, e) {
        const dir = this.getDir(ref, e.clientX, e.clientY)
        if (dir === 'no') {
            return
        }
        this.setMoveDir(ref, dir, e.clientX)
    }

    clickCheckbox (e) {
        const label = this.getLabel(e.clientX, e.clientY)
        if (label) {
            this.toggle(label)
        }
    }

    clickZoomOut (e) {

        const border = this.canvasEl.getBoundingClientRect()

        const canvasX = fromCssSize(e.clientX - border.left)
        const canvasY = fromCssSize(e.clientY - border.top)

        const c = this.zoomOutCoords

        if (c.x <= canvasX && c.toX >= canvasX && c.y <= canvasY && c.toY >= canvasY ) {
            this.zoom(this.pickedIndex, false)
        }
    }

    clickLegend (ref, e) {

        if (!ref.legendShown) {
            return false
        }

        const border = this.canvasEl.getBoundingClientRect()

        const canvasX = fromCssSize(e.clientX - border.left)
        const canvasY = fromCssSize(e.clientY - border.top)

        const c = ref.legendCoordinates

        if (canvasX >= c.x && canvasX <= c.toX && canvasY >= c.y && canvasY <= c.toY) {
            if (ref === this) {
                this.zoom(this.pickedIndex, true)
            }
            return true
        }

        return false
    }

    showLegend (ref, e) {

        if (ref.moveDir !== 'no') {
            return
        }

        const bound = this.el.getBoundingClientRect()

        const canvasY = fromCssSize(e.clientY - bound.top)

        if (canvasY > this.padH + this.chartHeight || canvasY < this.legendCoordinates.y) {
            return
        }

        const offsetLeft = fromCssSize(e.clientX - bound.left)

        this.setPickedIndex(ref, offsetLeft)

        this.cancelAnimation('legendPosition')

        ref.legendMoving = true
        ref.legendShown = true

        this.render()
    }

    moveLegend (ref, e) {

        if (!ref.legendMoving) {
            return
        }

        const bound = this.el.getBoundingClientRect()

        const canvasY = fromCssSize(e.clientY - bound.top)

        if (canvasY > this.padH + this.chartHeight || canvasY <= this.headerHeight) {
            return
        }

        const offsetLeft = fromCssSize(e.clientX - bound.left)

        this.setPickedIndex(ref, offsetLeft)

        this.render()
    }

    setPickedIndex (ref, offsetLeft) {

        let position = ref.currentLeft + (offsetLeft - this.padW) / this.chartWidth * ref.currentRange

        if (position < ref.currentLeft) {
            position = ref.currentLeft
        } else if (position > ref.currentRight) {
            position = ref.currentRight
        }

        ref.legendPosition = position
        ref.pickedIndex = getClosestIndex(ref.x, position)
    }

    stopMovingLegend (ref) {
        if (!ref.legendMoving) { return }
        ref.legendMoving = false
        const destinationPosition = (ref.x[ref.pickedIndex] - ref.x[1]) / ref.xDiff
        const uniqName = this.zoomState + 'legendPosition'
        this.addAnimation(ref, 'legendPosition', destinationPosition, animationDurationMs, uniqName)
        this.animate()
    }

    onMouseDown (e) {
        e.stopPropagation()
        this.setScroll(this.ref, e)
        this.clickCheckbox(e)
        this.clickZoomOut(e)
        if (!this.clickLegend(this.ref, e)) {
            this.showLegend(this.ref, e)
        }
    }

    onMouseMove (e) {
        e.stopPropagation()
        this.setMove(this.ref, e.clientX)
        this.moveLegend(this.ref, e)
    }

    onMouseUp (e) {
        e.stopPropagation()
        this.setNoMove(this.ref)
        this.stopMovingLegend(this.ref)
    }

    onMouseLeave (e) {
        e.stopPropagation()
        this.setNoMove(this.ref)
    }

    onTouchStart (e) {
        e.stopPropagation()
        const ev = e.targetTouches[0]
        this.setScroll(this.ref, ev)
        this.clickCheckbox(ev)
        this.clickZoomOut(ev)
        if (!this.clickLegend(this.ref, ev)) {
            this.showLegend(this.ref, ev)
        }
    }

    onTouchMove (e) {
        e.stopPropagation()

        const ev = e.targetTouches[0]
        this.setMove(this.ref, ev.clientX)
        this.moveLegend(this.ref, ev)
    }

    onTouchEnd (e) {
        e.stopPropagation()
        this.setNoMove()
        this.stopMovingLegend(this.ref)
    }

    nightMode (enable) {
        if (enable) {
            this.addAnimation(this, 'nightGrade', 1, animationDurationMs)
        } else {
            this.addAnimation(this, 'nightGrade', 0, animationDurationMs)
        }
        this.animate()
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
