
const roundingProbes = [ 2, 5, 10, 100, 1000, 10000, 100000, 1000000 ]
/*

> calcYAlignment(25, 1, 90, 20, 25, 75, 100, {})
{ max: 20, min: 0 }

*/

console.log(calcYAlignment(3770, 1310, 560, 40, 500, 100, 600, {}))

function calcYAlignment (maxVal, minVal, topOffset, maxBottomOffset, highestLine, lowestLine, height, vals) {

    let bottomOffset = height * minVal / maxVal
    bottomOffset = bottomOffset > maxBottomOffset ? maxBottomOffset : bottomOffset

    vals.max = maxVal - (maxVal - minVal) * (topOffset - highestLine) / (topOffset - bottomOffset)
    vals.min = minVal + (maxVal - minVal) * (lowestLine - bottomOffset) / (topOffset - bottomOffset)
    vals.top = height - topOffset
    vals.bottom = bottomOffset

    for (let probe of roundingProbes) {

        const topVal = floorTo(vals.max, probe)
        const bottomVal = ceilTo(vals.min, probe)
        console.log(probe, topVal, bottomVal)

        if (bottomVal >= topVal) {
            break
        }

        let top = (maxVal - topVal) / (topVal - bottomVal) * (highestLine - lowestLine)
        console.log(top)
        if (top >= (height - highestLine)) {
            break
        }

        let bottom = (bottomVal - minVal) / (topVal - bottomVal) * (highestLine - lowestLine)
console.log(bottom)
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
