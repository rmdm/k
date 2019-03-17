import Panel from './lib/panel'
import Canvas from './lib/canvas'
import Checkboxes from './lib/checkboxes'
import Scrollbar from './lib/scrollbar'
import ChartFactory from './lib/chart_factory'

import data from './data/chart_data.json'

const factory = new ChartFactory(Panel, Canvas, Scrollbar, Checkboxes)

const panels = []

document.addEventListener('DOMContentLoaded', function () {

    const parent = document.getElementById('root')

    for (let datum of data) {
        panels.push(factory.create(datum, parent))
    }

    window.moveLeft = function (left) {
        for (let panel of panels) {
            panel.canvas.moveLeft(left)
        }
    }

    window.moveRight = function (right) {
        for (let panel of panels) {
            panel.canvas.moveRight(right)
        }
    }

    window.disable = function (label) {
        for (let panel of panels) {
            panel.canvas.disable(label)
        }
    }

    window.enable = function (label) {
        for (let panel of panels) {
            panel.canvas.enable(label)
        }
    }
})
