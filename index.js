import Panel from './lib/panel'
import Canvas from './lib/canvas'
import Checkboxes from './lib/checkboxes'
import Scrollbar from './lib/scrollbar'
import ChartFactory from './lib/chart_factory'

import data from './data/chart_data.json'

const factory = new ChartFactory(Panel, Canvas, Scrollbar, Checkboxes)

document.addEventListener('DOMContentLoaded', function () {

    const parent = document.getElementById('root')

    for (let datum of data) {
        factory.create(datum, parent)
    }
})
