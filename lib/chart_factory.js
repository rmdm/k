import LineChart from './charts/line'
import LineYScaled from './charts/line-y-scaled'
import StackedBarChart from './charts/bar-stacked'
import BarChart from './charts/bar'
import PieChart from './charts/pie'

export default function () {

    return {

        create: function (data, parent) {

            let chart = null

            const overview = data.overview

            if (overview.y_scaled) {
                chart = new LineYScaled(data, {
                    width: parent.offsetWidth,
                    height: 320,
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 10,
                    padW: 10,
                    padH: 20,
                    lineWidth: 2,
                    previewPadW: 10,
                    previewPadH: 4,
                    previewHeight: 32,
                    previewLineWidth: 1,
                    checkboxesAreaHeight: 120,
                    checkboxHeight: 28,
                    checkboxRadius: 14,
                    checkboxMargin: 8,
                    legendFontSize: 12,
                    rullerWidth: 1,
                    from: 0.75,
                    to: 1,
                    datesDiff: 60,
                    gridLineWidth: 1,
                    header: 'Line Y Scaled Chart',
                    headerFontSize: 14,
                    dateRangeFontSize: 12,
                    headerHeight: 20,
                })
            } else if (overview.stacked && overview.percentage) {
                chart = new PieChart(data, {
                    width: parent.offsetWidth,
                    height: 320,
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 10,
                    padW: 10,
                    padH: 20,
                    lineWidth: 2,
                    previewPadW: 10,
                    previewPadH: 4,
                    previewHeight: 32,
                    previewLineWidth: 1,
                    checkboxesAreaHeight: 120,
                    checkboxHeight: 28,
                    checkboxRadius: 14,
                    checkboxMargin: 8,
                    legendFontSize: 12,
                    rullerWidth: 1,
                    from: 0.75,
                    to: 1,
                    datesDiff: 60,
                    gridLineWidth: 1,
                    header: 'Pie Chart',
                    headerFontSize: 14,
                    dateRangeFontSize: 12,
                    headerHeight: 20,
                })
            } else if (overview.stacked) {
                chart = new StackedBarChart(data, {
                    width: parent.offsetWidth,
                    height: 320,
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 10,
                    padW: 10,
                    padH: 20,
                    lineWidth: 2,
                    previewPadW: 10,
                    previewPadH: 4,
                    previewHeight: 32,
                    previewLineWidth: 1,
                    checkboxesAreaHeight: 120,
                    checkboxHeight: 28,
                    checkboxRadius: 14,
                    checkboxMargin: 8,
                    legendFontSize: 12,
                    rullerWidth: 1,
                    from: 0.75,
                    to: 1,
                    datesDiff: 60,
                    gridLineWidth: 1,
                    header: 'Stacked Bar Chart',
                    headerFontSize: 14,
                    dateRangeFontSize: 12,
                    headerHeight: 20,
                })
            } else if (Object.keys(overview.types).some(k => overview.types[k] === 'bar')) {
                chart = new BarChart(data, {
                    width: parent.offsetWidth,
                    height: 320,
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 10,
                    padW: 10,
                    padH: 20,
                    lineWidth: 2,
                    previewPadW: 10,
                    previewPadH: 4,
                    previewHeight: 32,
                    previewLineWidth: 1,
                    checkboxesAreaHeight: 120,
                    checkboxHeight: 28,
                    checkboxRadius: 14,
                    checkboxMargin: 8,
                    legendFontSize: 12,
                    rullerWidth: 1,
                    from: 0.75,
                    to: 1,
                    datesDiff: 60,
                    gridLineWidth: 1,
                    header: 'Bar Chart',
                    headerFontSize: 14,
                    dateRangeFontSize: 12,
                    headerHeight: 20,
                })
            } else {
                chart = new LineChart(data, {
                    width: parent.offsetWidth,
                    height: 320,
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 10,
                    padW: 10,
                    padH: 20,
                    lineWidth: 2,
                    previewPadW: 10,
                    previewPadH: 4,
                    previewHeight: 32,
                    previewLineWidth: 1,
                    checkboxesAreaHeight: 120,
                    checkboxHeight: 28,
                    checkboxRadius: 14,
                    checkboxMargin: 8,
                    legendFontSize: 12,
                    rullerWidth: 1,
                    from: 0.75,
                    to: 1,
                    datesDiff: 60,
                    gridLineWidth: 1,
                    header: 'Line Chart',
                    headerFontSize: 14,
                    dateRangeFontSize: 12,
                    headerHeight: 20,
                })
            }

            parent.appendChild(chart.el)
            chart.render()

            return chart
        },
    }
}
