import ChartFactory from './lib/chart_factory'
import NightSwitch from './lib/night_switch'

import data from './generated_data'

const factory = new ChartFactory()

let charts = []

document.addEventListener('DOMContentLoaded', function () {

    const parent = document.getElementById('root')

    for (let datum of data) {
        charts.push(factory.create(datum, parent))
    }

    function switchMode (enable) {
        charts.forEach(function (chart) {
            chart.nightMode(enable)
        })
    }

    const nightSwitch = new NightSwitch(switchMode)
    parent.appendChild(nightSwitch.el)

    function resize (width) {
        charts.forEach(function (chart) {
            chart.setWidth(width, true)
        })
    }

    window.addEventListener('resize', function () {
        resize(parent.offsetWidth)
    })

    resize(parent.offsetWidth)
})
