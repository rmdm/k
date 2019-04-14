const pixelRatio = window.devicePixelRatio || 1

export function toCssSize (value) {
    return value / pixelRatio
}

export function fromCssSize (value) {
    return value * pixelRatio
}

export function drawLines (ctx, x, lines, lineStates, lineGrades, lineColors, width, height, offsetW, offsetH, graphOffsetH, left, right, dX, maxHeight, minHeight, lineWidth, zoomGrade, inOut) {
    for (let line of lines) {
        const label = line[0]
        if (lineStates[label] || lineGrades[label] > 0) {
            drawLine(ctx, x, line, lineGrades[label], lineColors[label], width, height, offsetW, offsetH, graphOffsetH, left, right, dX, maxHeight, minHeight, lineWidth, zoomGrade, inOut)
        }
    }
}

export function drawLine (ctx, x, line, grade, color, width, height, offsetW, offsetH, bottomGraphOffsetH, left, right, dX, maxHeight, minHeight, lineWidth, zoomGrade, inOut) {

    if (minHeight > maxHeight) {
        return
    }

    const dRange = (right - left) / 2 * (1 - zoomGrade)
    const dx = dX * (1 - zoomGrade)

    left = left + dRange
    right = right - dRange
    dX = dX - dx

    const scaleX = width / dX
    const scaleY = (height - bottomGraphOffsetH) / (maxHeight - minHeight)

    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color(grade * zoomGrade)

    const fromIndex = getLowerIndex(x, left - offsetW / width)
    const toIndex = getUpperIndex(x, right + offsetW / width)

    let prevX = x[fromIndex]
    let prevXCoord = offsetW +
        ((prevX - x[1]) / ((x[x.length - 1] - x[1])) - left) * width / (right - left)

    const zeroH = offsetH + height - bottomGraphOffsetH

    ctx.beginPath()
    ctx.moveTo(prevXCoord, zeroH - line[fromIndex] * scaleY)

    for (let i = fromIndex + 1; i <= toIndex; i++) {

        const xi = x[i]
        const y = line[i] - minHeight

        const yCoord = zeroH - y * scaleY

        prevXCoord = prevXCoord + (xi - prevX) * scaleX
        ctx.lineTo(prevXCoord, yCoord)
        prevX = xi
    }

    ctx.stroke()
}

const roundingProbes = [ 2, 5, 10, 100, 1000, 10000, 100000, 1000000 ]

export function calcYAlignment (maxVal, minVal, topOffset, maxBottomOffset, highestLine, lowestLine, height, vals) {

    let bottomOffset = height * minVal / maxVal
    bottomOffset = bottomOffset > maxBottomOffset ? maxBottomOffset : bottomOffset

    vals.max = maxVal - (maxVal - minVal) * (topOffset - highestLine) / (topOffset - bottomOffset)
    vals.min = minVal + (maxVal - minVal) * (lowestLine - bottomOffset) / (topOffset - bottomOffset)
    vals.top = height - topOffset
    vals.bottom = bottomOffset

    for (let probe of roundingProbes) {

        const topVal = floorTo(vals.max, probe)
        const bottomVal = ceilTo(vals.min, probe)

        if (bottomVal >= topVal) {
            break
        }

        let top = (maxVal - topVal) / (topVal - bottomVal) * (highestLine - lowestLine)

        if (top >= (height - highestLine)) {
            break
        }

        let bottom = (bottomVal - minVal) / (topVal - bottomVal) * (highestLine - lowestLine)

        if (bottom >= lowestLine) {
            break
        }

        vals.max = topVal
        vals.min = bottomVal
        vals.top = height - highestLine - top
        vals.bottom = lowestLine - bottom
    }

    return vals
}

function floorTo (val, mod) {
    return ((val / mod) | 0) * mod
}

function ceilTo (val, mod) {
    return (((val / mod) | 0) + 1) * mod
}

export function drawGrid (ctx, offsetW, offsetH, width, height, nlines,
    fromMax, toMax, currentMax,
    fromMin, toMin, currentMin,
    lineMax, lineMin,
    topOffset, bottomOffset,
    getColor, getYColor, fromRight, lineGrade, lineWidth, textSize, nightGrade, zoomGrade) {

    if (toMin > toMax) {
        return
    }

    if (lineGrade === 0) {
        return
    }

    const topLineOffset = height - topOffset

    const scale = (topLineOffset - bottomOffset) / (currentMax - currentMin)

    const fromCurTop = topLineOffset - (currentMax - fromMax) * scale
    const toCurTop = topLineOffset + (toMax - currentMax) * scale
    const fromCurBottom = bottomOffset + (fromMin - currentMin) * scale
    const toCurBottom = bottomOffset - (currentMin - toMin) * scale

    const fromTopOffset = (fromCurTop - fromCurBottom) / (topLineOffset - bottomOffset) * topOffset
    const fromBottomOffset = (fromCurTop - fromCurBottom) / (topLineOffset - bottomOffset) * bottomOffset
    const toTopOffset = (toCurTop - toCurBottom) / (topLineOffset - bottomOffset) * topOffset
    const toBottomOffset = (toCurTop - toCurBottom) / (topLineOffset - bottomOffset) * bottomOffset

    const fromOffsetH = fromCurTop + fromTopOffset
    const dFrom = fromCurTop - fromCurBottom + fromTopOffset + fromBottomOffset
    const toOffsetH = toCurTop + toTopOffset
    const dTo = toCurTop - toCurBottom + toTopOffset + toBottomOffset

    const grade = (Math.abs(toMax - fromMax) + Math.abs(toMin - fromMin)) === 0
        ? 1
        : (Math.abs(fromMax - currentMax) + Math.abs(fromMin - currentMin)) /
            (Math.abs(toMax - fromMax) + Math.abs(toMin - fromMin))

    ctx.lineWidth = lineWidth
    ctx.strokeStyle = getColor(nightGrade, 1)

    ctx.beginPath()

    ctx.moveTo(offsetW, height + offsetH)
    ctx.lineTo(offsetW + width, height + offsetH)

    ctx.stroke()

    drawGridLines(ctx, offsetW, height + offsetH - toOffsetH, width, dTo, nlines, lineMax, lineMin, textSize, fromRight, getColor(nightGrade, grade * zoomGrade), getYColor(nightGrade, grade * zoomGrade), grade)

    if (grade < 1) {
        drawGridLines(ctx, offsetW, height + offsetH - fromOffsetH, width, dFrom, nlines, lineMax, lineMin, textSize, fromRight, getColor(nightGrade, (1 - grade) * zoomGrade), getYColor(nightGrade, (1 - grade) * zoomGrade), grade)
    }
}

function drawGridLines (ctx, offsetW, offsetH, width, height, nlines, fromVal, toVal, textSize, fromRight, color, yColor, grade) {

    ctx.strokeStyle = color
    ctx.fillStyle = yColor

    ctx.beginPath()

    const linesDiff = height / (nlines + 1)
    const valsDiff = (fromVal - toVal) / (nlines - 1)

    for (let i = 0, y = offsetH + linesDiff, v = fromVal; i < nlines; i++, y += linesDiff, v -= valsDiff) {
        ctx.moveTo(offsetW, y)
        ctx.lineTo(offsetW + width, y)
        const x = fromRight ? offsetW + width - ctx.measureText(v).width : offsetW
        ctx.fillText(v | 0, x, y - textSize / 2)
    }

    const v = (toVal - valsDiff) | 0
    const x = fromRight ? offsetW + width - ctx.measureText(v).width : offsetW
    ctx.fillText(v, x, offsetH + height - textSize / 2)

    ctx.stroke()
}

export function drawDates (ctx, offsetW, offsetH, scale, baseX, xDiff, format, left, right, fromPeriod, toPeriod, grade, getColor, nightGrade, zoomGrade) {

    let fromFillStyle, toFillStyle

    if (fromPeriod > toPeriod) {
        toFillStyle = getColor(nightGrade, grade * zoomGrade)
        fromFillStyle = getColor(nightGrade, zoomGrade)
    } else {
        toFillStyle = getColor(nightGrade, zoomGrade)
        fromFillStyle = getColor(nightGrade, (1 - grade) * zoomGrade)
    }

    ctx.fillStyle = toFillStyle
    const toN = Math.floor(left / toPeriod) - 1
    for (let p = toPeriod * toN; p < right + toPeriod; p += toPeriod) {
        const timestamp = Math.floor(baseX + xDiff * p)
        drawDate(ctx, offsetW, offsetH, timestamp, format, p, left, scale)
    }

    if (fromPeriod === toPeriod) {
        return
    }

    ctx.fillStyle = fromFillStyle
    const fromN = Math.floor(left / fromPeriod) - 1
    for (let p = fromPeriod * fromN; p < right + fromPeriod; p += fromPeriod) {
        const timestamp = Math.floor(baseX + xDiff * p)
        drawDate(ctx, offsetW, offsetH, timestamp, p, left, scale)
    }
}

const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]
const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]
const shortDays = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ]
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/*
- Apr 1 'monthdate'
- 1 April 2019 'date'
- Saturday, 1 April 2019 'weekdate'
- Sat, 1 April 2019 'shortweekdate'
- 12:00 'hours'
*/

export function formatDate (timestamp, format) {

    const d = new Date(timestamp)

    switch (format) {
        case 'date':
            return d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
        case 'hours':
            return leftPad(d.getUTCHours()) + ':00'
        case 'monthdate':
            return shortMonths[d.getUTCMonth()] + ' ' + d.getUTCDate()
        case 'weekdate':
            return shortDays[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
        case 'shortweekdate':
            return days[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear()

    }
}

function leftPad (v) {
    return v < 10 ? '0' + v : v
}

const dateOffset = fromCssSize(18)

function drawDate (ctx, offsetW, offsetH, timestamp, format, position, left, scale) {
    const text = formatDate(timestamp, format)
    ctx.fillText(text, offsetW + (position - left) * scale - dateOffset, offsetH)
}

export const controlWidth = fromCssSize(10)
export const previewPadding = fromCssSize(2)
const controlRadius = fromCssSize(8)

export function drawScrollControlls (ctx, offsetW, offsetH, width, height, from, to,
    getPreviewBlurColor, getPreviewControlColor, nightGrade, zoomGrade) {

    const left = offsetW + from * width + controlWidth
    const right = offsetW + to * width - controlWidth
    const fromH = offsetH - previewPadding
    const toH = offsetH + height + previewPadding

    ctx.fillStyle = getPreviewBlurColor(nightGrade, zoomGrade)
    ctx.beginPath()
    drawRoundedRect(ctx, offsetW, left, fromH, toH, controlRadius, 0)
    drawRoundedRect(ctx, right, offsetW + width, fromH, toH, 0, controlRadius)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = getPreviewControlColor(nightGrade, zoomGrade)
    ctx.beginPath()
    drawRoundedRect(ctx, left - controlWidth, left, fromH, toH, controlRadius, 0)
    drawRoundedRect(ctx, right, right + controlWidth, fromH, toH, 0, controlRadius)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = getPreviewControlColor(nightGrade, zoomGrade)
    ctx.moveTo(left, fromH)
    ctx.lineTo(right, fromH)
    ctx.moveTo(left, toH)
    ctx.lineTo(right, toH)
    ctx.stroke()
}

export function drawRoundedRect (ctx, fromX, toX, fromY, toY, leftRadius, rightRadius) {
    ctx.moveTo(fromX + leftRadius, fromY)
    ctx.lineTo(toX - rightRadius, fromY)
    ctx.quadraticCurveTo(toX, fromY, toX, fromY + rightRadius)
    ctx.lineTo(toX, toY - rightRadius)
    ctx.quadraticCurveTo(toX, toY, toX - rightRadius, toY)
    ctx.lineTo(fromX + leftRadius, toY)
    ctx.quadraticCurveTo(fromX, toY, fromX, toY - leftRadius)
    ctx.lineTo(fromX, fromY + leftRadius)
    ctx.quadraticCurveTo(fromX, fromY, fromX + leftRadius, fromY)
}

export function drawCheckboxes (ctx, offsetW, offsetH, maxWidth, checkboxes, checkboxHeight, checkboxRadius, checkboxMargin, checkboxFont, nightGrade) {

    const ctxFont = ctx.font

    ctx.font = (checkboxHeight / 2) + 'px ' + checkboxFont

    let leftOffset = offsetW, topOffset = offsetH

    for (let checkbox of checkboxes) {
        const textWidth = ctx.measureText(checkbox.label).width
        const width = textWidth + 1.5 * checkboxHeight
        if (leftOffset + width + 1.5 * checkboxMargin > maxWidth) {
            leftOffset = offsetW
            topOffset = checkboxHeight + checkboxMargin
        }
        drawCheckbox(ctx, leftOffset, topOffset, width, checkboxHeight, checkboxRadius,
            checkbox.label, textWidth, checkbox.getColor, checkbox.grade, nightGrade)
        checkbox.x = leftOffset
        checkbox.y = topOffset
        checkbox.toX = leftOffset + width
        checkbox.toY = topOffset + checkboxHeight
        leftOffset += width + checkboxMargin
    }

    ctx.font = ctxFont
}

const checkboxBorderWidth = fromCssSize(4)

export function drawCheckbox (ctx, offsetW, offsetH, width, height, radius, text, textWidth, getColor, grade, nightGrade) {

    ctx.strokeStyle = getColor(0, 0)
    ctx.lineWidth = checkboxBorderWidth

    ctx.beginPath()
    ctx.fillStyle = getColor(1 - grade, nightGrade)
    drawRoundedRect(ctx, offsetW, offsetW + width, offsetH, offsetH + height, radius, radius)
    ctx.closePath()
    ctx.stroke()
    ctx.fill()

    ctx.fillStyle = getColor(grade, 0)
    ctx.strokeStyle = ctx.fillStyle
    ctx.fillText(text, offsetW + 0.75 * height + height * grade / 3, offsetH + 2/3 * height)

    if (grade > 0.5) {
        const checkGrade = 2 * (grade - 0.5)
        ctx.lineWidth = checkboxBorderWidth / 2
        ctx.beginPath()
        const o = offsetW + height / 4
        ctx.moveTo(o, offsetH + height / 2)
        ctx.lineTo(o + height / 6, offsetH + height * 2/3)
        ctx.lineTo(o + height / 6 + height / 3 * checkGrade, offsetH + height * 2/3 - height / 3 * checkGrade)
        ctx.stroke()
    }
}

const legendPadding = fromCssSize(10)
const legendOffset = fromCssSize(10)
const crossRadius = fromCssSize(4)

export function drawRuller (ctx, offsetW, offsetH, rullerWidth, rullerHeight, width, left, right, range, position, getRullerColor, alphaGrade, nightGrade) {

    const leftOffset = offsetW + (position - left) / (range) * width

    ctx.lineWidth = rullerWidth
    ctx.strokeStyle = getRullerColor(nightGrade, alphaGrade)
    ctx.beginPath()
    ctx.moveTo(leftOffset, offsetH)
    ctx.lineTo(leftOffset, offsetH + rullerHeight)
    ctx.stroke()
}

export function drawLinesLegend (ctx, x, lineKinds, lineLabels, lineStates, lineGrades, lineColors, lineWidth,
    position, closestIndex, offsetW, offsetH, left, right, range, width, height, xDiff,
    paramKinds,
    textSize, textFont, getLegendColor, getLegendBorderColor, getLegendFontColor, getBackgroundColor,
    alphaGrade, nightGrade, coordinates, zoomGrade, format, drawArrow) {

    const ctxFont = ctx.font

    const legendFont = textSize + 'px ' + textFont

    const timestamp = Math.floor(x[1] + xDiff * position)

    const text = formatDate(timestamp, format)

    const leftOffset = offsetW + (position - left) / (range) * width

    ctx.font = 'bold ' + legendFont
    let contentWidth = ctx.measureText(text).width + 3 * legendPadding
    let contentHeight = textSize

    let maxValueWidth = 0

    let lowestTopOffset = height

    for (let i = 0; i < lineKinds.length; i++) {

        const lines = lineKinds[i]

        for (const line of lines) {

            const label = line[0]

            if (lineStates[label] || lineGrades[label] > 0) {

                const val = line[closestIndex]
                const name = lineLabels[label]

                ctx.font = legendFont
                const nameWidth = ctx.measureText(name).width
                ctx.font = 'bold ' + legendFont
                const valWidth = ctx.measureText(val).width

                contentHeight += legendPadding + textSize

                const lineWidth = valWidth + nameWidth + legendPadding

                if (lineWidth > contentWidth) {
                    contentWidth = lineWidth
                }

                if (valWidth > maxValueWidth) {
                    maxValueWidth = valWidth
                }

                let approxValue = val

                if (x[closestIndex] > timestamp) {
                    const lowerIndex = Math.max(1, closestIndex - 1)
                    approxValue = approximateHeight(x, line, timestamp, lowerIndex, closestIndex)
                } else if (x[closestIndex] < timestamp) {
                    const upperIndex = Math.min(x.length - 1, closestIndex + 1)
                    approxValue = approximateHeight(x, line, timestamp, closestIndex, upperIndex)
                }

                const param = paramKinds[i]

                // const topOffset = height - (approxValue - currentMinHeight) * (height - topGraphOffsetH - bottomGraphOffsetH) / (currentMaxHeight - currentMinHeight)
                // top, bottom, max, min
                const topOffset = height - (approxValue - param[3]) * (height - param[0] - param[1]) / (param[2] - param[3])

                if (topOffset < lowestTopOffset) {
                    lowestTopOffset = topOffset
                }
            }
        }
    }

    const legendWidth = contentWidth + 2 * legendPadding
    const legendHeight = contentHeight + 2 * legendPadding

    let legendOffsetLeft = leftOffset - legendWidth / 2

    let additionalOffset = 0

    if (lowestTopOffset - legendPadding < offsetH + legendHeight) {
        additionalOffset = legendWidth / 2 + legendPadding
    }

    let nextOffset = legendOffsetLeft + additionalOffset

    if (nextOffset < 0) {
        additionalOffset = additionalOffset ? -additionalOffset : legendWidth / 2 + 10
    }

    const rightOverflow = nextOffset + legendWidth - width + offsetW

    if (rightOverflow > 0) {
        additionalOffset = additionalOffset ? -additionalOffset : -legendWidth / 2 - 10
    }

    legendOffsetLeft += additionalOffset

    ctx.fillStyle = getLegendColor(nightGrade, alphaGrade)
    ctx.strokeStyle = getLegendBorderColor(alphaGrade)
    ctx.lineWidth = 1
    ctx.beginPath()
    coordinates.x = legendOffsetLeft
    coordinates.toX = coordinates.x + legendWidth
    coordinates.y = offsetH
    coordinates.toY = coordinates.y + legendHeight
    drawRoundedRect(ctx, coordinates.x, coordinates.toX, coordinates.y, coordinates.toY, controlRadius, controlRadius)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    let textOffsetH = coordinates.y + legendPadding + textSize

    ctx.fillStyle = getLegendFontColor(nightGrade, alphaGrade)
    ctx.fillText(text, coordinates.x + legendPadding, textOffsetH)

    if (drawArrow) {
        ctx.beginPath()
        const arrowSide = textSize / 2
        ctx.moveTo(coordinates.toX - legendPadding - arrowSide, coordinates.y + legendPadding)
        ctx.lineTo(coordinates.toX - legendPadding, coordinates.y + legendPadding + arrowSide)
        ctx.lineTo(coordinates.toX - legendPadding - arrowSide, coordinates.y + legendPadding + textSize)
        ctx.stroke()
    }

    textOffsetH += legendPadding + textSize

    for (let lines of lineKinds) {
        for (const line of lines) {

            const label = line[0]

            if (lineStates[label] || lineGrades[label] > 0) {

                const value = line[closestIndex]
                const name = lineLabels[label]

                ctx.font = legendFont
                ctx.fillStyle = getLegendFontColor(nightGrade, lineGrades[label] * alphaGrade)
                ctx.fillText(name, coordinates.x + legendPadding, textOffsetH)

                ctx.font = 'bold ' + legendFont
                ctx.fillStyle = lineColors[label](lineGrades[label] * zoomGrade)
                const valWidth = ctx.measureText(value).width
                ctx.fillText(value, coordinates.x + legendPadding + contentWidth - valWidth, textOffsetH)

                textOffsetH += legendPadding + textSize
            }
        }
    }

    ctx.font = ctxFont
}

export function drawLinesCross (ctx, x, line, lineLabels, lineStates, lineGrades, lineColors, lineWidth,
    position, closestIndex, offsetW, offsetH, left, right, range, width, height, xDiff,
    topGraphOffsetH, bottomGraphOffsetH, currentMaxHeight, currentMinHeight,
    getBackgroundColor, nightGrade, zoomGrade) {

    if (zoomGrade < 1) { return }

    if (currentMinHeight >= currentMaxHeight) {
        return
    }

    const label = line[0]

    const scaleY = (height - topGraphOffsetH - bottomGraphOffsetH) / (currentMaxHeight - currentMinHeight)
    const leftOffset = offsetW + (position - left) / (range) * width

    const timestamp = Math.floor(x[1] + xDiff * position)

    if (lineStates[label] || lineGrades[label] > 0) {

        const value = line[closestIndex]
        ctx.strokeStyle = lineColors[label](lineGrades[label] * zoomGrade)

        let approxValue = value

        if (x[closestIndex] > timestamp) {
            const lowerIndex = Math.max(1, closestIndex - 1)
            approxValue = approximateHeight(x, line, timestamp, lowerIndex, closestIndex)
        } else if (x[closestIndex] < timestamp) {
            const upperIndex = Math.min(x.length - 1, closestIndex + 1)
            approxValue = approximateHeight(x, line, timestamp, closestIndex, upperIndex)
        }

        const topOffset = offsetH + height - bottomGraphOffsetH - (approxValue - currentMinHeight) * scaleY

        ctx.fillStyle = getBackgroundColor(nightGrade)
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        ctx.arc(leftOffset, topOffset, crossRadius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
    }
}

function approximateHeight (x, line, timestamp, lowerIndex, upperIndex) {
    const affinity = (timestamp - x[lowerIndex]) / (x[upperIndex] - x[lowerIndex])
    return line[lowerIndex] + (line[upperIndex] - line[lowerIndex]) * affinity
}

export function drawHeader (ctx, offsetW, offsetH, headerHeight, fontSize, font, text, getColor, nightGrade, zoomGrade) {

    let ctxFont = ctx.font

    ctx.fillStyle = getColor(nightGrade, zoomGrade)
    ctx.font = 'bold ' + fontSize + 'px ' + font

    ctx.fillText(text, offsetW, offsetH + (headerHeight + fontSize) / 2)

    ctx.font = ctxFont
}

const magnifierLineWidth = fromCssSize(2)

export function drawZoomOutControl (ctx, offsetW, offsetH, headerHeight, fontSize, font, getColor, nightGrade, zoomGrade, coords) {

    let ctxFont = ctx.font

    ctx.fillStyle = getColor(nightGrade, zoomGrade)
    ctx.strokeStyle = ctx.fillStyle
    ctx.font = 'bold ' + fontSize + 'px ' + font

    const magnifierHeight = fontSize + 2 * magnifierLineWidth
    const magnifierRadius = (fontSize - 2 * magnifierLineWidth) / 2

    ctx.lineWidth = magnifierLineWidth
    ctx.beginPath()

    ctx.arc(offsetW + magnifierRadius, headerHeight / 2, magnifierRadius, 0, 2 * Math.PI)
    ctx.moveTo(offsetW + magnifierRadius - 1.5 * magnifierLineWidth, headerHeight / 2)
    ctx.lineTo(offsetW + magnifierRadius + 1.5 * magnifierLineWidth, headerHeight / 2)
    ctx.moveTo(offsetW + 1.5 * magnifierRadius, headerHeight / 2 + 0.5 * magnifierRadius)
    ctx.lineTo(offsetW + 2.5 * magnifierRadius, headerHeight / 2 + 1.5 * magnifierRadius)

    ctx.stroke()

    const zoomOutText = 'Zoom Out'

    coords.x = offsetW
    coords.toX = offsetW + ctx.measureText(zoomOutText).width + magnifierHeight
    coords.y = offsetH
    coords.toY = coords.y + headerHeight

    ctx.fillText(zoomOutText, offsetW + magnifierHeight, offsetH + (headerHeight + fontSize) / 2)

    ctx.font = ctxFont
}

export function drawDateRangeSummary (ctx, offsetW, offsetH, width, headerHeight, headerFontSize, baseDate, xDiff, left, right, isRange, fontSize, font, getColor, nightGrade, zoomGrade) {

    let ctxFont = ctx.font

    ctx.fillStyle = getColor(nightGrade, zoomGrade)
    ctx.font = 'bold ' + fontSize + 'px ' + font

    const leftTimestamp = baseDate + xDiff * left
    const rightTimestamp = baseDate + xDiff * right

    let text

    if (isRange) {
        text = formatDate(leftTimestamp, 'date') + ' - ' + formatDate(rightTimestamp, 'date')
    } else {
        text = formatDate((leftTimestamp + rightTimestamp) / 2, 'weekdate')
    }

    ctx.fillText(text, offsetW + width - ctx.measureText(text).width, offsetH + (headerHeight + fontSize) / 2 + (headerFontSize - fontSize) / 2)

    ctx.font = ctxFont
}

export function getLowerIndex (x, procent) {
    const val = x[1] + (x[x.length - 1] - x[1]) * procent
    const idx = binarySearch(x, val, 1)
    return x[idx] > val ? Math.max(idx - 1, 1) : idx
}

export function getUpperIndex (x, procent) {
    const val = x[1] + (x[x.length - 1] - x[1]) * procent
    const idx = binarySearch(x, val, 1)
    return x[idx] < val ? Math.min(idx + 1, x.length - 1) : idx
}


export function getClosestIndex (x, procent) {
    const val = x[1] + (x[x.length - 1] - x[1]) * procent
    return binarySearch(x, val, 1)
}

function binarySearch (arr, val, i = 0) {

    const len = arr.length

    let j = len - 1

    while (i < j) {
        const m = (j + i) >>> 1
        const v = arr[m]
        if (v > val) {
            j = m - 1
        } else if (v < val) {
            i = m + 1
        } else {
            return m
        }
    }

    const diff = val - arr[i]

    if (diff > 0) {
        return i < len - 1 && diff > arr[i+1] - val ? i + 1 : i
    } else {
        return i > 0 && diff < arr[i-1] - val ? i - 1 : i
    }
}

export function getMaxY (x, lines, lineStates, left, right) {

    let max = 0

    const from = getLowerIndex(x, left)
    const to = getUpperIndex(x, right)

    for (const line of lines) {

        if (!lineStates[line[0]]) {
            continue
        }

        for (let i = from; i < to; i++) {
            if (line[i] > max) {
                max = line[i]
            }
        }
    }

    return max
}

export function getMinY (x, lines, lineStates, left, right) {

    let min = Infinity

    const from = getLowerIndex(x, left)
    const to = getUpperIndex(x, right)

    for (const line of lines) {

        if (!lineStates[line[0]]) {
            continue
        }

        for (let i = from; i < to; i++) {
            if (line[i] < min) {
                min = line[i]
            }
        }
    }

    return min
}

function colorFromRGBA (r, g, b, a) {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

export function animatableAlphaHEXcolor (hex, alpha) {

    const R = getR(hex)
    const G = getG(hex)
    const B = getB(hex)

    return function (grade) {
        return colorFromRGBA(R, G, B, alpha * grade)
    }
}

export function animatableHexColor (fromHex, fromAlpha, toHex, toAlpha) {

    const fromR = getR(fromHex)
    const fromG = getG(fromHex)
    const fromB = getB(fromHex)
    const dR = getR(toHex) - fromR
    const dG = getG(toHex) - fromG
    const dB = getB(toHex) - fromB
    const dAlpha = toAlpha - fromAlpha

    return function (grade, alphaGrade = 1) {
        return colorFromRGBA(
            fromR + dR * grade,
            fromG + dG * grade,
            fromB + dB * grade,
            (fromAlpha + dAlpha * grade) * alphaGrade
        )
    }
}

export function dynamicHexColor (fromHex, fromAlpha, toHex, toAlpha, toAltHex, toAltAlpha) {

    const fromR = getR(fromHex)
    const fromG = getG(fromHex)
    const fromB = getB(fromHex)
    const toDR = getR(toHex) - fromR
    const toDG = getG(toHex) - fromG
    const toDB = getB(toHex) - fromB
    const toAltDR = getR(toAltHex) - fromR
    const toAltDG = getG(toAltHex) - fromG
    const toAltDB = getB(toAltHex) - fromB
    const toDAlpha = toAlpha - fromAlpha
    const toDAltAlpha = toAltAlpha - fromAlpha

    return function (grade, pickGrade = 0) {
        const notPickGrade = 1 - pickGrade
        return colorFromRGBA(
            (fromR + toDR * grade) * notPickGrade +
            (fromR + toAltDR * grade) * pickGrade,
            (fromG + toDG * grade) * notPickGrade +
            (fromG + toAltDG * grade) * pickGrade,
            (fromB + toDB * grade) * notPickGrade +
            (fromB + toAltDB * grade) * pickGrade,
            (fromAlpha + toDAlpha * grade) * notPickGrade +
            (fromAlpha + toDAltAlpha * grade) * pickGrade
        )
    }
}

function getR (hex) {
    return parseInt(hex.slice(1, 3), 16)
}

function getG (hex) {
    return parseInt(hex.slice(3, 5), 16)
}

function getB (hex) {
    return parseInt(hex.slice(5), 16)
}

export function getLines (data) {
    const result = []
    for (let column of data.columns) {
        if (data.types[column[0]] === 'line') {
            result.push(column)
        }
    }
    return result
}

export function getX (data) {
    for (let column of data.columns) {
        if (data.types[column[0]] === 'x') {
            return column
        }
    }
}
