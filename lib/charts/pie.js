import AnimatableChart from '../animatable_chart'
import {

    getAreas,
    sumBars,
    getLowerIndex,
    getUpperIndex,

    fromCssSize,

    drawArea,
    drawGrid,
    drawLinesLegend,
    drawRuller,
    drawPie,
} from '../utils'

export default class PieChart extends AnimatableChart {

    constructor (data, options) {
        super(data, options)

        this.areas = getAreas(data.overview)

        this.calcProcents(this)

        this.currentMaxHeight = this.fromMaxHeight = this.toMaxHeight = 100
        this.maxHeight = 100

        this.currentMinHeight = this.fromMinHeight = this.toMinHeight = 0
        this.minHeight = 0

        this.maxIndex = this.x.length - 1

        this.yAlign = { top: 0, bottom: 0, max: 75, min: 25 }

        this.shares = {}
        this.coords = {
            centerX: 0,
            centerY: 0,
            angles: {},
        }

        for (const label in this.lineLabels) {
            this.shares[label] = {
                procent: 0,
                sum: 0,
                grade: 0,
            }
            this.coords.angles[label] = {
                from: 0,
                to: 0,
            }
        }
    }

    drawView (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        this.drawChart(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawGrid(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawDates(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawPreview(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        this.drawScroll(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)

        if (this.legendShown && (zoomGrade < 1 || (this.legendPosition >= this.currentLeft && this.legendPosition <= this.currentRight))) {
            this.drawLegend(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }
    }

    drawGrid (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {

            drawGrid(this.ctx, this.padW, this.headerHeight, this.chartWidth, this.chartHeight + this.padH, 3,
                ref.fromMaxHeight, ref.toMaxHeight, ref.currentMaxHeight,
                ref.fromMinHeight, ref.toMinHeight, ref.currentMinHeight,
                ref.yAlign.max, ref.yAlign.min, ref.yAlign.top, ref.yAlign.bottom,
                this.getGridColor, this.getAxisColor, false, 1, this.gridLineWidth, this.textSize, this.nightGrade, zoomGrade)
        }
    }

    drawChart (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {

            drawArea(this.ctx, this.x, this.areas, this.summedAreas, this.referenceSummedAreas, this.lineGrades, this.lineColors,
                this.chartWidth, this.chartHeight + this.padH, this.padW, this.headerHeight, this.leftIndex, this.rightIndex,
                this.currentLeft, this.currentRight, zoomGrade, this.nightGrade, shrink)
        } else {

            drawPie(this.ctx, this.lineLabels, this.lineGrades, this.lineColors,
                this.padW, this.headerHeight + 2 * this.padW, this.chartWidth, this.chartHeight / 2, this.shares, zoomGrade, this.coords)
        }
    }

    drawDates (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {
            // redraw only if moving
            super.drawDates(ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade)
        }
    }

    drawPreview (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        drawArea(this.ctx, this.x, this.areas, this.fullSummedAreas, this.referenceFullSummedAreas, this.lineGrades, this.lineColors,
            this.chartWidth, this.previewHeight, this.padW, this.previewOffsetH, 1, this.maxIndex,
            0, 1, zoomGrade, this.nightGrade, shrink)
    }

    drawLegend (ref, shrink, yAxisdateFormat, legendDateFormat, zoomGrade) {

        if (ref === this) {

            drawRuller(this.ctx, this.padW, this.headerHeight, this.rullerWidth, this.chartHeight + this.padH, this.chartWidth,
                this.currentLeft, this.currentRight, this.currentRange, this.legendPosition, this.getRullerColor, zoomGrade, this.nightGrade)

            drawLinesLegend(this.ctx, this.x, [this.areas], this.lineLabels, this.lineStates, this.lineGrades, this.lineColors, this.lineWidth,
                this.legendPosition, this.pickedIndex, this.padW, this.headerHeight + this.padH, this.currentLeft, this.currentRight, this.currentRange,
                this.chartWidth, this.chartHeight + this.padH, this.xDiff,
                [[0, 0, 0, 0]],
                this.legendTextSize, this.textFont, this.getLegendColor, this.getLegendBorderColor, this.getLegendFontColor, this.getBackgroundColor,
                zoomGrade, this.nightGrade, this.legendCoordinates, zoomGrade, legendDateFormat, ref === this)
        }
    }

    calc (ref) {
        super.calc(ref)
        this.calcProcents(ref)
    }

    calcDates (ref) {
        if (ref === this) {
            super.calcDates(ref)
        }
    }

    calcProcents (ref) {

        ref.leftIndex = getLowerIndex(this.x, ref.currentLeft - this.padW / this.chartWidth)
        ref.rightIndex = getUpperIndex(this.x, ref.currentRight + this.padW / this.chartWidth)

        this.fullSummedAreas = sumBars(this.x, this.areas, this.lineGrades, 0, 1)
        this.summedAreas = this.fullSummedAreas.slice(Math.max(this.leftIndex - 1, 0), this.rightIndex + 1)
        this.referenceSummedAreas = this.summedAreas.slice(0)
        this.referenceFullSummedAreas = this.fullSummedAreas.slice(0)

        if (ref !== this) {
            this.calcShares(ref)
        }
    }

    calcShares (ref) {

        let total = 0

        for (const area of this.areas) {
            let areaSum = 0
            for (let i = ref.leftIndex; i <= ref.rightIndex; i++) {
                areaSum += area[i]
            }
            areaSum = areaSum * this.lineGrades[area[0]]
            total += areaSum
            this.shares[area[0]].sum = areaSum
        }

        for (const label in this.shares) {
            this.shares[label].procent = this.shares[label].sum / total
        }
    }

    clickPie (e) {

        if (this.zoomState === 'overview') { return }

        const border = this.getBoundingClientRect()

        const canvasX = fromCssSize(e.clientX - border.left)
        const canvasY = fromCssSize(e.clientY - border.top)

        if (canvasY < this.headerHeight || canvasY > this.headerHeight + this.chartHeight) {
            return
        }

        let angle = Math.atan((canvasX - this.coords.centerX) / (canvasY - this.coords.centerY))

        if (canvasY > this.coords.centerY) {
            angle = Math.PI / 2 - angle
        } else {
            angle = Math.PI * 3 / 2 - angle
        }

        let found = null

        for (let label in this.coords.angles) {
            const a = this.coords.angles[label]
            if (angle >= a.from && angle <= a.to) {
                found = label
            }
        }

        if (!found) {

            angle = angle + 2 * Math.PI

            for (let label in this.coords.angles) {
                const a = this.coords.angles[label]
                if (angle >= a.from && angle <= a.to) {
                    found = label
                }
            }
        }

        if (found) {
            this.addAnimation(this.shares[found], 'grade', 1, this.animationDurationMs, 'angle' + found)
            for (let label in this.shares) {
                if (label === found) { continue }
                this.addAnimation(this.shares[label], 'grade', 0, this.animationDurationMs, 'angle' + label)
            }
            this.animate()
        }
    }

    onMouseUp (e) {
        super.onMouseUp(e)
        this.clickPie(e)
    }

    onTouchEnd (e) {
        super.onMouseUp(e)
        this.clickPie(e)
    }
}
