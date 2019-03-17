export default function (Panel, Canvas, Scrollbar, Checkboxes) {

    return {

        create: function (data, parent) {

            const canvas = new Canvas(data, {
                padW: 10,
                padH: 10,
                decor: true,
                width: parent.offsetWidth,
                height: 300,
                from: 0.75,
                to: 1,
            })

            const scrollCanvas = new Canvas(data, {
                padW: 10,
                padH: 4,
                decor: false,
                width: parent.offsetWidth,
                height: 32,
                from: 0,
                to: 1,
            })

            const scrollbar = new Scrollbar(data, canvas, scrollCanvas, {
                from: 0.75,
                to: 1,
                padW: 10,
                border: 10,
            })

            const checkboxes = new Checkboxes(data, canvas, scrollCanvas)

            const panel = new Panel(canvas, scrollbar, checkboxes)

            parent.appendChild(panel.el)
            panel.render()

            return panel
        },
    }
}
