import AnimatableChart from '../animatable_chart'
import {

    getX,
    getLines,

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
} from '../utils'

export default class LineChart extends AnimatableChart {

    constructor (data, options) {
        super(data, options)

        this.lines = getLines(data.overview)

        this.currentMaxHeight = this.fromMaxHeight = this.toMaxHeight =
            getMaxY(this.x, this.lines, this.lineStates, this.currentLeft, this.currentRight)
        this.maxHeight = getMaxY(this.x, this.lines, this.lineStates, 0, 1)

        this.currentMinHeight = this.fromMinHeight = this.toMinHeight =
            getMinY(this.x, this.lines, this.lineStates, this.currentLeft, this.currentRight)
        this.minHeight = getMinY(this.x, this.lines, this.lineStates, 0, 1)
    }

    drawChart (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawLines(this.ctx, ref.x, ref.lines, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.chartHeight + this.padH - ref.yAlign.top, this.padW, this.headerHeight + ref.yAlign.top, ref.yAlign.bottom,
            ref.currentLeft, ref.currentRight, ref.xDiff * ref.currentRange, ref.currentMaxHeight, ref.currentMinHeight, this.lineWidth, zoomGrade, shrink)
    }

    drawPreview (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawLines(this.ctx, ref.x, ref.lines, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.previewHeight, this.padW, this.previewOffsetH, 0,
            0, 1, ref.xDiff, ref.maxHeight, ref.minHeight, this.previewLineWidth, zoomGrade, shrink)
    }

    drawLegend (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawRuller(this.ctx, this.padW, this.headerHeight + this.padH, this.rullerWidth, this.chartHeight, this.chartWidth,
            ref.currentLeft, ref.currentRight, ref.currentRange, ref.legendPosition, this.getRullerColor, zoomGrade, this.nightGrade)

        for (let line of ref.lines) {
            drawLinesCross(this.ctx, ref.x, line, this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth,
                ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight, ref.currentLeft, ref.currentRight, ref.currentRange,
                this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
                ref.yAlign.top, ref.yAlign.bottom, ref.currentMaxHeight, ref.currentMinHeight,
                this.getBackgroundColor, this.nightGrade, zoomGrade)
        }

        drawLinesLegend(this.ctx, ref.x, [ref.lines], this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth,
            ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight + this.padH, ref.currentLeft, ref.currentRight, ref.currentRange,
            this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
            [[ref.yAlign.top, ref.yAlign.bottom, ref.currentMaxHeight, ref.currentMinHeight]],
            this.legendTextSize, this.textFont, this.getLegendColor, this.getLegendBorderColor, this.getLegendFontColor, this.getBackgroundColor,
            zoomGrade, this.nightGrade, ref.legendCoordinates, zoomGrade, legendDateFormat, ref === this)
    }

    calc (ref) {
        super.calc(ref)
        this.calcHeight(ref)
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
            this.addAnimation(ref, 'currentMaxHeight', visibleMaxHeight, this.animationDurationMs, uniqName)
            this.animate()
        }

        const visibleMinHeight = getMinY(ref.x, ref.lines, ref.lineStates, ref.currentLeft, ref.currentRight)

        if (visibleMinHeight !== ref.toMinHeight) {
            const uniqName = this.zoomState + 'currentMinHeight'
            this.addAnimation(ref, 'currentMinHeight', visibleMinHeight, this.animationDurationMs, uniqName)
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

    getDetails (index) {

        const details = super.getDetails(index)

        const columns = this.mergeZoomedColumns(details.fromLeft, details.toRight)

        const data = { columns, types: this.details[this.x[1]].types }
        const x = getX(data)
        const lines = getLines(data)
        const rangeMaxHeight = getMaxY(x, lines, this.lineStates, details.currentLeft, details.currentRight)
        const rangeMinHeight = getMinY(x, lines, this.lineStates, details.currentLeft, details.currentRight)

        const maxHeight = getMaxY(x, lines, this.lineStates, 0, 1)
        const minHeight = getMinY(x, lines, this.lineStates, 0, 1)

        let fromMaxHeight, toMaxHeight, currentMaxHeight,
            fromMinHeight, toMinHeight, currentMinHeight

        fromMaxHeight = toMaxHeight = currentMaxHeight = rangeMaxHeight
        fromMinHeight = toMinHeight = currentMinHeight = rangeMinHeight

        const xDiff = x[x.length - 1] - x[1]

        details.x = x
        details.xDiff = xDiff
        details.lines = lines
        details.maxHeight = maxHeight
        details.minHeight = minHeight
        details.fromMaxHeight = fromMaxHeight
        details.toMaxHeight = toMaxHeight
        details.currentMaxHeight = currentMaxHeight
        details.fromMinHeight = fromMinHeight
        details.toMinHeight = toMinHeight
        details.currentMinHeight = currentMinHeight

        return details
    }
}
