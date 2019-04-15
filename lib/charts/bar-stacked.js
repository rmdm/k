import AnimatableChart from '../animatable_chart'
import {
    getX,
    sumBars,
    getBars,
    drawStackedBars,
    calcTopYAlignment,
    dynamicHexColorWithBlending,
    drawLinesLegend,
} from '../utils'

export default class StackedBarChart extends AnimatableChart {

    constructor (data, options) {
        super(data, options)

        this.bars = getBars(data.overview)


        this.lineColors = {}
        for (let label in this.lineLabels) {
            this.lineColors[label] =
                dynamicHexColorWithBlending(data.overview.colors[label], 1, '#FFFFFF', 0.5, '#242F3E', 0.5)
        }

        this.summedBars = sumBars(this.x, this.bars, this.lineGrades,
            this.currentLeft - this.padW / this.chartWidth, this.currentRight + this.padW / this.chartWidth)
        this.fullSummedBars = sumBars(this.x, this.bars, this.lineGrades, 0, 1)

        this.currentMaxHeight = this.fromMaxHeight = this.toMaxHeight =
            this.summedBars[0]
        this.maxHeight = this.fullSummedBars[0]

        this.currentMinHeight = this.fromMinHeight = this.toMinHeight = 0
        this.minHeight = 0
    }

    drawView (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        this.drawChart(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawGrid(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawDates(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawPreview(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawScroll(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        if (ref.legendShown && (zoomGrade < 1 || (ref.legendPosition >= ref.currentLeft && ref.legendPosition <= ref.currentRight))) {
            this.drawLegend(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }
    }

    drawChart (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawStackedBars(this.ctx, ref.x, ref.bars, ref.summedBars, this.lineGrades, this.lineGrades, this.lineColors,
            this.chartWidth, this.chartHeight + this.padH, this.padW, this.headerHeight, ref.pickedIndex,
            ref.currentLeft, ref.currentRight, ref.currentMaxHeight, zoomGrade, this.nightGrade, shrink)
    }

    drawPreview (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawStackedBars(this.ctx, ref.x, ref.bars, ref.fullSummedBars.slice(0), this.lineGrades, this.lineGrades, this.lineColors,
            this.chartWidth, this.previewHeight, this.padW, this.previewOffsetH, 0,
            0, 1, ref.maxHeight, zoomGrade, shrink)
    }

    drawLegend (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawLinesLegend(this.ctx, ref.x, [ref.bars], this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth,
            ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight + this.padH, ref.currentLeft, ref.currentRight, ref.currentRange,
            this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
            [[0, 0, 0, 0]],
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

        calcTopYAlignment(ref.toMaxHeight, chartHeight - this.padH,
            chartHeight - linesDiff, linesDiff, chartHeight, ref.yAlign)
    }

    calcHeight (ref) {

        ref.summedBars = sumBars(ref.x, ref.bars, this.lineGrades,
            ref.currentLeft - this.padW / this.chartWidth, ref.currentRight + this.padW / this.chartWidth)

        const newMaxHeight = ref.summedBars[0]

        if (newMaxHeight !== this.toMaxHeight) {
            const uniqName = this.zoomState + 'currentMaxHeight'
            this.addAnimation(ref, 'currentMaxHeight', newMaxHeight, this.animationDurationMs, uniqName)
            this.animate()
        }

        const maxAnim = this.animations[this.zoomState + 'currentMaxHeight']

        if (maxAnim) {
            ref.fromMaxHeight = maxAnim.from
            ref.toMaxHeight = maxAnim.to
        }
    }

    getDetails (index, skip) {

        const details = super.getDetails(index)

        if (skip) {
            return details
        }

        const columns = this.mergeZoomedColumns(details.fromLeft, details.toRight)

        const data = { columns, types: this.details[this.x[1]].types }
        const x = getX(data)
        const bars = getBars(data)

        const summedBars = sumBars(x, bars, this.lineGrades,
            details.currentLeft - this.padW / this.chartWidth, details.currentRight + this.padW / this.chartWidth)
        const rangeMaxHeight = summedBars[0]
        const rangeMinHeight = 0

        const fullSummedBars = sumBars(x, bars, this.lineGrades, 0, 1)
        const maxHeight = fullSummedBars[0]
        const minHeight = 0

        let fromMaxHeight, toMaxHeight, currentMaxHeight,
            fromMinHeight, toMinHeight, currentMinHeight

        fromMaxHeight = toMaxHeight = currentMaxHeight = rangeMaxHeight
        fromMinHeight = toMinHeight = currentMinHeight = rangeMinHeight

        const xDiff = x[x.length - 1] - x[1]

        details.x = x
        details.xDiff = xDiff
        details.bars = bars
        details.summedBars = summedBars
        details.fullSummedBars = fullSummedBars
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
