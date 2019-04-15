import StackedBarChart from './bar-stacked'
import {

    getX,
    getLines,
    getMaxY,
    getMinY,
    calcYAlignment,

    formatDate,
    animatableAlphaHEXcolor,
    dynamicHexColor,
    drawCheckboxes,
    drawLines,
    drawRuller,
    drawLinesCross,
    drawLinesLegend,
} from '../utils'

export default class BarChart extends StackedBarChart {

    constructor (data, options) {
        super(data, options)

        this.detailsColors = [ '#4681BB', '#466FB3', '#479FC4' ]
    }

    drawChart (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {
            return super.drawChart(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }

        drawLines(this.ctx, ref.x, ref.lines, ref.lineStates, ref.lineGrades, ref.lineColors,
            this.chartWidth, this.chartHeight + this.padH - ref.yAlign.top, this.padW, this.headerHeight + ref.yAlign.top, ref.yAlign.bottom,
            ref.currentLeft, ref.currentRight, ref.xDiff * ref.currentRange, ref.currentMaxHeight, ref.currentMinHeight, this.lineWidth, zoomGrade, shrink)
    }

    drawPreview (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {
            return super.drawPreview(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }
    }

    drawScroll (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {
            return super.drawScroll(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }
    }

    drawLegend (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {
            return super.drawLegend(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade, false)
        }

        drawRuller(this.ctx, this.padW, this.headerHeight + this.padH, this.rullerWidth, this.chartHeight, this.chartWidth,
            ref.currentLeft, ref.currentRight, ref.currentRange, ref.legendPosition, this.getRullerColor, zoomGrade, this.nightGrade)

        for (let line of ref.lines) {
            drawLinesCross(this.ctx, ref.x, line, ref.lineLabels, ref.lineStates, ref.lineGrades, ref.lineColors, this.lineWidth,
                ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight, ref.currentLeft, ref.currentRight, ref.currentRange,
                this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
                ref.yAlign.top, ref.yAlign.bottom, ref.currentMaxHeight, ref.currentMinHeight,
                this.getBackgroundColor, this.nightGrade, zoomGrade)
        }

        drawLinesLegend(this.ctx, ref.x, [ref.lines], ref.lineLabels, ref.lineStates, ref.lineGrades, ref.lineColors, this.lineWidth,
            ref.legendPosition, ref.pickedIndex, this.padW, this.headerHeight + this.padH, ref.currentLeft, ref.currentRight, ref.currentRange,
            this.chartWidth, this.chartHeight + this.padH, ref.xDiff,
            [[ref.yAlign.top, ref.yAlign.bottom, ref.currentMaxHeight, ref.currentMinHeight]],
            this.legendTextSize, this.textFont, this.getLegendColor, this.getLegendBorderColor, this.getLegendFontColor, this.getBackgroundColor,
            zoomGrade, this.nightGrade, ref.legendCoordinates, zoomGrade, legendDateFormat, ref === this)
    }

    drawCheckboxes (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) { return }

        // redraw only if checked
        drawCheckboxes(this.ctx, this.padW, ref.checkboxesOffsetH, this.chartWidth,
            ref.checkboxes, this.checkboxHeight, this.checkboxRadius, this.checkboxMargin, this.textFont, this.nightGrade, zoomGrade)
    }

    calcHeight (ref) {

        if (ref === this) {
            return super.calcHeight(ref)
        }

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

        const details = super.getDetails(index, true)

        const indexes = [index]

        if (index - 1 > 1) {
            indexes.push(index - 1)
        }

        if (index - 2 > 1) {
            indexes.push(Math.max(index - 7, 1))
        }

        const detailsAtIndex = this.details[this.x[index]]

        const x = getX(detailsAtIndex)
        const lines = []
        const checkboxes = []
        const checkboxLabelToIndex = {}

        let i = 0

        const lineStates = {}
        const lineGrades = {}
        const lineColors = {}
        const lineLabels = {}

        for (let idx of indexes) {

            const label = 'y' + idx

            const timestamp = this.x[idx]
            const line = getLines(this.details[timestamp])[0]
            line[0] = label
            lines.push(line)

            lineLabels[label] = formatDate(timestamp, 'day')

            const color = this.detailsColors[i]

            lineStates[label] = true
            lineGrades[label] = 1
            lineColors[label] = animatableAlphaHEXcolor(color, 1)
            checkboxLabelToIndex[label] = i++
            checkboxes.push({
                id: 'y' + idx,
                label: lineLabels[label],
                getColor: dynamicHexColor(color, 1, '#FFFFFF', 1, '#26333F', 1),
                grade: 1,
                x: 0,
                y: 0,
                toX: 0,
                toY: 0,
            })
        }

        const maxHeight = getMaxY(x, lines, lineStates, 0, 1)
        const minHeight = getMinY(x, lines, lineStates, 0, 1)

        let fromMaxHeight, toMaxHeight, currentMaxHeight,
            fromMinHeight, toMinHeight, currentMinHeight

        fromMaxHeight = toMaxHeight = currentMaxHeight = maxHeight
        fromMinHeight = toMinHeight = currentMinHeight = minHeight

        const xDiff = x[x.length - 1] - x[1]

        details.checkboxes = checkboxes
        details.checkboxLabelToIndex = checkboxLabelToIndex
        details.checkboxesOffsetH = this.previewOffsetH

        details.lineStates = lineStates
        details.lineGrades = lineGrades
        details.lineColors = lineColors
        details.lineLabels = lineLabels

        details.currentLeft = 0
        details.currentRight = 1
        details.currentRange = 1

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

    setScroll (ref, e) {
        if (ref === this) {
            super.setScroll(ref, e)
        }
    }
}
