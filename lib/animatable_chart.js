import {

    getX,

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
    drawRuller,
    drawLinesCross,
} from './draw-tools'

export default class AnimatedCanvas {

    constructor (data, options) {

        this.animations = {}
        this.running = false
        this.prevMs = undefined

        this.el = document.createElement('div')
        this.el.className = 'chart'

        this.canvasEl = document.createElement('canvas')
        this.ctx = this.canvasEl.getContext('2d')

        this.el.appendChild(this.canvasEl)

        this.setFont(options)
        this.setSize(options)

        this.headerText = options.header

        this.details = data.details

        data = data.overview

        this.x = getX(data)

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

        this.currentMaxHeight = this.fromMaxHeight = this.toMaxHeight = 0
        this.maxHeight = 0

        this.currentMinHeight = this.fromMinHeight = this.toMinHeight = 0
        this.minHeight = 0

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

        this.animationDurationMs = 250

        this.getGridColor = animatableHexColor('#182D3B', 0.1, '#FFFFFF', 0.1)
        this.getAxisColor = animatableHexColor('#8E8E93', 1, '#A3B1C2', 0.6)
        this.getRullerColor = animatableHexColor('#182D3B', 0.1, '#FFFFFF', 0.1)
        this.getLegendBorderColor = animatableAlphaHEXcolor('#1E1E1E', 0.2)
        this.getLegendFontColor = animatableHexColor('#000000', 1, '#FFFFFF', 1)
        this.getLegendColor = animatableHexColor('#FFFFFF', 1, '#1F2A35', 1)
        this.getBackgroundColor = animatableHexColor('#FFFFFF', 1, '#26333F', 1)
        this.getPreviewBlurColor = animatableHexColor('#E2EEF9', 0.6, '#304259', 0.6)
        this.getPreviewControlColor = animatableHexColor('#C0D1E1', 1, '#56626D', 1)
        this.getZoomOutColor = animatableHexColor('#108BE3', 1, '#48AAF0', 1)
    }

    animate () {

        if (this.running) {
            return
        }

        this.running = true

        const step = (ms) => {

            if (!this.prevMs) {
                this.prevMs = ms
                requestAnimationFrame(step)
                return
            }

            const diffMs = ms - this.prevMs
            this.prevMs = ms

            if (diffMs === 0) {
                requestAnimationFrame(step)
                return
            }

            let hasAnimations = false

            for (const uniqName in this.animations) {
                const anim = this.animations[uniqName]
                if (!anim || anim.from === anim.to || anim.from === Infinity || anim.to === Infinity) {
                    this.animations[uniqName] = null
                    continue
                }
                hasAnimations = true
                anim.container[anim.prop] += (anim.to - anim.from) * diffMs / anim.duration
                if ((anim.container[anim.prop] - anim.from) / (anim.to - anim.from) >= 1) {
                    anim.container[anim.prop] = anim.to
                    anim.from = anim.to
                }
            }

            if (hasAnimations) {
                requestAnimationFrame(step)
            } else {
                this.prevMs = undefined
                this.running = false
            }

            this.render()
        }

        requestAnimationFrame(step)
    }

    addAnimation (container, prop, to, duration, uniqName) {
        this.animations[uniqName || prop] = {
            container,
            prop,
            from: container[prop],
            to,
            duration
        }
    }

    cancelAnimation (uniqName) {
        delete this.animations[uniqName]
    }

    setSize (options) {

        this.setBasicSizes(options)
        this.setWidth(options.width)

        this.height = fromCssSize(options.height)
        this.canvasEl.height = this.height
        this.canvasEl.style.height = options.height + 'px'

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

        this.border = null
    }

    setFont (options) {
        this.textSize = fromCssSize(options.fontSize)
        this.textFont = options.fontFamily
        this.ctxFont = this.textSize + 'px ' + options.fontFamily
        this.ctx.font = this.ctxFont
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
            this.border = null
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
        this.addAnimation(this.lineGrades, label, to, this.animationDurationMs)
        this.addAnimation(this.checkboxes[this.checkboxLabelToIndex[label]], 'grade', to, this.animationDurationMs, 'checkbox_' + label)
        this.animate()
    }

    zoom (index, direction) {

        if (direction) {
            this.addAnimation(this, 'zoomFromGrade', 0, this.animationDurationMs)
            if (index !== this.zoomedIndex) {
                this.zoomedData = this.getDetails(index)
                this.zoomedIndex = index
            }
            this.ref = this.zoomedData
            this.addAnimation(this, 'zoomToGrade', 1, this.animationDurationMs)
            this.zoomState = 'details'
        } else {
            this.ref = this
            this.addAnimation(this, 'zoomFromGrade', 1, this.animationDurationMs)
            this.addAnimation(this, 'zoomToGrade', 0, this.animationDurationMs)
            this.zoomState = 'overview'
        }

        this.animate()
    }

    render () {

        this.ctx.clearRect(0, 0, this.width, this.height)

        if (this.zoomFromGrade > 0) {
            this.calc(this)

            drawHeader(this.ctx, this.padW, 0, this.headerHeight, this.headerFontSize, this.textFont, this.headerText, this.getLegendFontColor, this.nightGrade, this.zoomFromGrade)
            drawDateRangeSummary(this.ctx, this.padW, 0, this.chartWidth, this.headerHeight, this.headerFontSize, this.x[1], this.xDiff, this.currentLeft, this.currentRight, true, this.dateRangeFontSize, this.textFont, this.getLegendFontColor, this.nightGrade, this.zoomFromGrade)

            this.drawView(this, false, 'monthdate', 'shortweekdate', this.zoomFromGrade)
        }

        if (this.zoomToGrade > 0) {
            const details = this.zoomedData
            this.calc(details)

            drawZoomOutControl(this.ctx, this.padW, 0, this.headerHeight, this.headerFontSize, this.textFont, this.getZoomOutColor, this.nightGrade, this.zoomToGrade, this.zoomOutCoords)
            drawDateRangeSummary(this.ctx, this.padW, 0, this.chartWidth, this.headerHeight, this.headerFontSize, details.x[1], details.xDiff, details.currentLeft, details.currentRight, false, this.dateRangeFontSize, this.textFont, this.getLegendFontColor, this.nightGrade, this.zoomToGrade)

            this.drawView(details, true, 'hours', 'hours', this.zoomToGrade)
        }

        // redraw only if checked
        drawCheckboxes(this.ctx, this.padW, this.checkboxesOffsetH, this.chartWidth,
            this.checkboxes, this.checkboxHeight, this.checkboxRadius, this.checkboxMargin, this.textFont, this.nightGrade)
    }

    drawView (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        this.drawGrid(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawChart(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawDates(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawPreview(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawScroll(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        if (ref.legendShown && (zoomGrade < 1 || (ref.legendPosition >= ref.currentLeft && ref.legendPosition <= ref.currentRight))) {
            this.drawLegend(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }
    }

    drawGrid (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawGrid(this.ctx, this.padW, this.headerHeight, this.chartWidth, this.chartHeight + this.padH, 5,
            ref.fromMaxHeight, ref.toMaxHeight, ref.currentMaxHeight,
            ref.fromMinHeight, ref.toMinHeight, ref.currentMinHeight,
            ref.yAlign.max, ref.yAlign.min, ref.yAlign.top, ref.yAlign.bottom,
            this.getGridColor, this.getAxisColor, false, 1, this.gridLineWidth, this.textSize, this.nightGrade, zoomGrade)
    }

    drawChart (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {}

    drawDates (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        // redraw only if moving
        drawDates(this.ctx, this.padW, this.datesOffsetH,
            this.chartWidth / ref.currentRange, ref.x[1], ref.xDiff, yAxisdateFormat, ref.currentLeft, ref.currentRight,
            this.fromPeriod, this.toPeriod, this.datesGrade, this.getAxisColor, this.nightGrade, zoomGrade)
    }

    drawPreview (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {}

    drawScroll (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        // redraw only if moving or checked
        drawScrollControlls(this.ctx, this.padW, this.previewOffsetH, this.chartWidth, this.previewHeight,
            ref.currentLeft, ref.currentRight, this.getPreviewBlurColor, this.getPreviewControlColor, this.nightGrade, zoomGrade)
    }

    drawLegend (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {}

    calc (ref) {
        this.calcDates(ref)
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
            this.addAnimation(ref, 'datesGrade', 1, this.animationDurationMs, uniqName)
            this.animate()
        } else if (currentDiff < this.datesDiff) {
            const uniqName = this.zoomState + 'datesGrade'
            ref.fromPeriod = ref.toPeriod
            ref.toPeriod = ref.toPeriod * 2
            this.datesGrade = 0
            this.addAnimation(ref, 'datesGrade', 1, this.animationDurationMs, uniqName)
            this.animate()
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

        const border = this.getBoundingClientRect()

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

        const border = this.getBoundingClientRect()

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

        const border = this.getBoundingClientRect()

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

        const border = this.getBoundingClientRect()

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
        this.addAnimation(ref, 'legendPosition', destinationPosition, this.animationDurationMs, uniqName)
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
            this.addAnimation(this, 'nightGrade', 1, this.animationDurationMs)
        } else {
            this.addAnimation(this, 'nightGrade', 0, this.animationDurationMs)
        }
        this.animate()
    }

    getBoundingClientRect () {
        if (!this.border) {
            this.border = this.canvasEl.getBoundingClientRect()
        }
        return this.border
    }
}
