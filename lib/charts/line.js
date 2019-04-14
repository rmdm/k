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
} from '../draw-tools'

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
            zoomGrade, this.nightGrade, ref.legendCoordinates, zoomGrade, legendDateFormat, this.zoomState === 'overview')
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
}
