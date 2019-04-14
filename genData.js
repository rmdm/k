const fs = require('fs')

const graphsDir = './data'
const graphs = fs.readdirSync(graphsDir)

const generatedData = []

for (let graph of graphs) {

    const graphDir = graphsDir + '/' + graph
    const months = fs.readdirSync(graphDir)

    const genGraph = { overview: require(graphDir + '/overview.json'), details: {} }

    generatedData.push(genGraph)

    for (const month of months) {

        if (month === 'overview.json') { continue }

        const monthDir = graphDir + '/' + month
        const days = fs.readdirSync(monthDir)

        for (const day of days) {

            const dataPath = monthDir + '/' + day

            const ym = month.split('-')
            const y = parseInt(ym[0])
            const m = parseInt(ym[1])
            const d = parseInt(day.slice(0, -5))

            const dayData = require(dataPath)

            let x

            for (let column of dayData.columns) {
                if (dayData.types[column[0]] === 'x') {
                    x = column
                }
            }

            const timestamp = new Date(x[1])

            if (timestamp.getUTCHours() != 0) {
                timestamp.setUTCHours(0)
            }

            genGraph.details[timestamp.getTime()] = dayData
        }
    }
}

fs.writeFileSync(__dirname + '/generated_data.json', JSON.stringify(generatedData))

// let text = ''

// for (let graph in graphsData) {

//     const graphData = graphsData[graph]

//     text += `import overview_${graph} from '${graphData.overview}'\n`

//     for (const [ filename, dataPath ] of graphData.details) {
//         text += `import ${filename} from '${dataPath}'\n`
//     }
// }

// text += 'export default [\n'

// for (let graph in graphsData) {
//     text += '{\n'

//     text += `overview: overview_${graph},\n`

//     text += 'details: {\n'
//     for (const [ filename ] of graphsData[graph].details) {
//         text += `[${filename}.columns[0][1]]: ${filename},\n`
//     }
//     text += '},\n'

//     text += '},\n'
// }

// text += ']\n'

// fs.writeFileSync(__dirname + '/generated_data.js', text)
