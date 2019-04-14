import AnimatableChart from '../animatable_chart'

export default class StackedBarChart extends AnimatableChart {

    constructor (data, options) {
        super(options)
    }

    render () {
        this.ctx.font = '30px serif'
        this.ctx.fillStyle = 'black'
        this.ctx.fillText('StackedBarChart not implemented', 0, 30)
    }

    setWidth () {

    }
}
