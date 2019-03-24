export default function (Panel, Canvas, Scrollbar, Checkboxes) {

    let n = 1

    return {

        create: function (data, parent) {

            const canvas = new Canvas(data, {
                padW: 10,
                padH: 20,
                decor: true,
                width: parent.offsetWidth,
                height: 320,
                lineWidth: 2,
                from: 0.75,
                to: 1,
                datesDiff: 60,
                fontFamily: 'Helvetica, sans-serif',
                fontSize: 10,
            })

            const scrollCanvas = new Canvas(data, {
                padW: 10,
                padH: 4,
                decor: false,
                width: parent.offsetWidth,
                height: 32,
                lineWidth: 1,
                from: 0,
                to: 1,
            })

            const scrollbar = new Scrollbar(data, canvas, scrollCanvas, {
                from: 0.75,
                to: 1,
                padW: 10,
                bound: 10,
            })

            const checkboxes = new Checkboxes(data, canvas, scrollCanvas)

            const panel = new Panel(canvas, scrollbar, scrollCanvas, checkboxes, {
                header: 'Chart #' + n++,
            })

            parent.appendChild(panel.el)
            panel.render()

            return panel
        },
    }
}
