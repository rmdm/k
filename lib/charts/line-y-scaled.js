import LineChart from './line'
import {

    calcYAlignment,
    animatableHexColor,

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

const animationDurationMs = 250

export default class LineYScaled extends LineChart {

    constructor (data, options) {

        const lines2 = data.overview.columns.splice(2, 1)

        const details2 = {}

        for (let timestamp in data.details) {
            details2[timestamp] = data.details[timestamp].columns.splice(2, 1)[0]
        }

        super(data, options)

        this.lines2 = lines2
        this.details2 = details2

        this.currentMaxHeight2 = this.fromMaxHeight2 = this.toMaxHeight2 =
            getMaxY(this.x, lines2, this.lineStates, this.currentLeft, this.currentRight)
        this.maxHeight2 = getMaxY(this.x, lines2, this.lineStates, 0, 1)

        this.currentMinHeight2 = this.fromMinHeight2 = this.toMinHeight2 =
            getMinY(this.x, lines2, this.lineStates, this.currentLeft, this.currentRight)
        this.minHeight2 = getMinY(this.x, lines2, this.lineStates, 0, 1)

        this.yAlign2 = {}

        this.getAxisColor1 = animatableHexColor(data.overview.colors['y0'], 1, data.overview.colors['y0'], 1)
        this.getAxisColor2 = animatableHexColor(data.overview.colors['y1'], 1, data.overview.colors['y0'], 1)
    }

    drawGrid (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawGrid(this.ctx, this.padW, this.headerHeight, this.chartWidth, this.chartHeight + this.padH, 5,
            ref.fromMaxHeight, ref.toMaxHeight, ref.currentMaxHeight,
            ref.fromMinHeight, ref.toMinHeight, ref.currentMinHeight,
            ref.yAlign.max, ref.yAlign.min, ref.yAlign.top, ref.yAlign.bottom,
            this.getGridColor, this.getAxisColor1, false, this.lineGrades['y0'], this.gridLineWidth, this.textSize, this.nightGrade, zoomGrade)

        drawGrid(this.ctx, this.padW, this.headerHeight, this.chartWidth, this.chartHeight + this.padH, 5,
            ref.fromMaxHeight2, ref.toMaxHeight2, ref.currentMaxHeight2,
            ref.fromMinHeight2, ref.toMinHeight2, ref.currentMinHeight2,
            ref.yAlign2.max, ref.yAlign2.min, ref.yAlign2.top, ref.yAlign2.bottom,
            this.getGridColor, this.getAxisColor2, true, this.lineGrades['y1'], this.gridLineWidth, this.textSize, this.nightGrade, zoomGrade)
    }

    drawChart (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawLines(this.ctx, ref.x, ref.lines2, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.chartHeight + this.padH - ref.yAlign2.top, this.padW, this.headerHeight + ref.yAlign2.top, ref.yAlign2.bottom,
            ref.currentLeft, ref.currentRight, ref.xDiff * ref.currentRange,
            ref.currentMaxHeight2, ref.currentMinHeight2, this.lineWidth, zoomGrade, shrink)

        drawLines(this.ctx, ref.x, ref.lines, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.chartHeight + this.padH - ref.yAlign.top, this.padW, this.headerHeight + ref.yAlign.top, ref.yAlign.bottom,
            ref.currentLeft, ref.currentRight, ref.xDiff * ref.currentRange, ref.currentMaxHeight, ref.currentMinHeight, this.lineWidth, zoomGrade, shrink)
    }

    drawPreview (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawLines(this.ctx, ref.x, ref.lines2, this.lineStates, this.lineGrades, this.lineColors,
            this.chartWidth, this.previewHeight, this.padW, this.previewOffsetH, 0,
            0, 1, ref.xDiff, ref.maxHeight2, ref.minHeight2, this.previewLineWidth, zoomGrade, shrink)

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

        for (let line of ref.lines2) {
            drawLinesCross(this.ctx, ref.x, line, this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth,
                ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight, ref.currentLeft, ref.currentRight, ref.currentRange,
                this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
                ref.yAlign2.top, ref.yAlign2.bottom, ref.currentMaxHeight2, ref.currentMinHeight2,
                this.getBackgroundColor, this.nightGrade, zoomGrade)
        }

        drawLinesLegend(this.ctx, ref.x, [ref.lines, ref.lines2], this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth,
            ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight + this.padH, ref.currentLeft, ref.currentRight, ref.currentRange,
            this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
            [
                [ref.yAlign.top, ref.yAlign.bottom, ref.currentMaxHeight, ref.currentMinHeight,],
                [ref.yAlign2.top, ref.yAlign2.bottom, ref.currentMaxHeight2, ref.currentMinHeight2,]
            ],
            this.legendTextSize, this.textFont, this.getLegendColor, this.getLegendBorderColor, this.getLegendFontColor, this.getBackgroundColor,
            zoomGrade, this.nightGrade, ref.legendCoordinates, zoomGrade, legendDateFormat, this.zoomState === 'overview')
    }

    calcYAlignment (ref) {

        super.calcYAlignment(ref)

        const chartHeight = this.chartHeight + this.padH
        const linesDiff = chartHeight / 6

        calcYAlignment(ref.toMaxHeight2, ref.toMinHeight2,
            chartHeight - this.padH, this.padH, chartHeight - linesDiff, linesDiff, chartHeight, ref.yAlign2)
    }

    calcHeight (ref) {

        super.calcHeight(ref)

        const visibleMaxHeight = getMaxY(ref.x, ref.lines2, ref.lineStates, ref.currentLeft, ref.currentRight)

        if (visibleMaxHeight !== ref.toMaxHeight2) {
            const uniqName = this.zoomState + 'currentMaxHeight2'
            this.addAnimation(ref, 'currentMaxHeight2', visibleMaxHeight, animationDurationMs, uniqName)
            this.animate()
        }

        const visibleMinHeight = getMinY(ref.x, ref.lines2, ref.lineStates, ref.currentLeft, ref.currentRight)

        if (visibleMinHeight !== ref.toMinHeight2) {
            const uniqName = this.zoomState + 'currentMinHeight2'
            this.addAnimation(ref, 'currentMinHeight2', visibleMinHeight, animationDurationMs, uniqName)
            this.animate()
        }

        const maxAnim = this.animations[this.zoomState + 'currentMaxHeight2']

        if (maxAnim) {
            ref.fromMaxHeight2 = maxAnim.from
            ref.toMaxHeight2 = maxAnim.to
        }

        const minAnim = this.animations[this.zoomState + 'currentMinHeight2']

        if (minAnim) {
            ref.fromMinHeight2 = minAnim.from
            ref.toMinHeight2 = minAnim.to
        }
    }

    getDetails (index) {

        const details = super.getDetails(index)

        let fromLeft = index - 3
        let toRight = index + 3

        if (fromLeft < 1) {
            toRight += 1 - fromLeft
            fromLeft = 1
        } else if (toRight >= this.x.length) {
            fromLeft -= toRight - this.x.length + 1
            toRight = this.x.length - 1
        }

        let lines2 = []

        for (let i = fromLeft; i <= toRight; i++) {
            const timestamp = this.x[i]
            const details2 = this.details2[timestamp]
            if (!lines2.length) {
                lines2[0] = details2[0]
            }
            let k = details2.length
            const offset = lines2.length - 1
            while (k-- > 1) {
                lines2[offset + k] = details2[k]
            }
        }

        lines2 = [lines2]

        const rangeMaxHeight2 = getMaxY(details.x, lines2, this.lineStates, details.currentLeft, details.currentRight)
        const rangeMinHeight2 = getMinY(details.x, lines2, this.lineStates, details.currentLeft, details.currentRight)

        const maxHeight2 = getMaxY(details.x, lines2, this.lineStates, 0, 1)
        const minHeight2 = getMinY(details.x, lines2, this.lineStates, 0, 1)

        let fromMaxHeight2, toMaxHeight2, currentMaxHeight2,
            fromMinHeight2, toMinHeight2, currentMinHeight2

        fromMaxHeight2 = toMaxHeight2 = currentMaxHeight2 = rangeMaxHeight2
        fromMinHeight2 = toMinHeight2 = currentMinHeight2 = rangeMinHeight2

        details.lines2 = lines2
        details.maxHeight2 = maxHeight2
        details.minHeight2 = minHeight2
        details.fromMaxHeight2 = fromMaxHeight2
        details.toMaxHeight2 = toMaxHeight2
        details.currentMaxHeight2 = currentMaxHeight2
        details.fromMinHeight2 = fromMinHeight2
        details.toMinHeight2 = toMinHeight2
        details.currentMinHeight2 = currentMinHeight2
        details.yAlign2 = {}

        return details
    }
}
