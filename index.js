import Panel from './lib/panel'
import Canvas from './lib/canvas'
import Checkboxes from './lib/checkboxes'
import ChartFactory from './lib/chart_factory'
import NightSwitch from './lib/night_switch'

import data from './data/chart_data.json'

const factory = new ChartFactory(Panel, Canvas, Checkboxes)

let panels = []

document.addEventListener('DOMContentLoaded', function () {

    const parent = document.getElementById('root')

    for (let datum of data) {
        panels.push(factory.create(datum, parent))
    }

    function switchMode (enable) {
        panels.forEach(function (panel) {
            panel.nightMode(enable)
        })
    }

    const nightSwitch = new NightSwitch(switchMode)
    parent.appendChild(nightSwitch.el)

    function scale (width) {
        panels.forEach(function (panel) {
            panel.scale(width)
        })
    }

    window.addEventListener('resize', function () {
        scale(parent.offsetWidth)
    })

    scale(parent.offsetWidth)
})
