export default function (Panel, Canvas, Checkboxes) {

    let n = 1

    return {

        create: function (data, parent) {

            const canvas = new Canvas(data, {
                padW: 10,
                padH: 20,
                width: parent.offsetWidth,
                height: 320,
                lineWidth: 2,
                previewPadW: 10,
                previewPadH: 4,
                previewHeight: 32,
                previewLineWidth: 1,
                from: 0.75,
                to: 1,
                datesDiff: 60,
                fontFamily: 'Helvetica, sans-serif',
                fontSize: 10,
            })

            const checkboxes = new Checkboxes(data, canvas)

            const panel = new Panel(canvas, checkboxes, {
                header: 'Chart #' + n++,
            })

            parent.appendChild(panel.el)
            panel.render()

            return panel
        },
    }
}
