import {
    toCssSize,
    fromCssSize
} from './draw-tools'

class AnimatedCanvas {

    constructor (options) {

        this.animations = {}
        this.running = false
        this.prevMs = undefined

        this.el = document.createElement('div')
        this.el.className = 'chart'

        this.canvasEl = document.createElement('canvas')
        this.ctx = this.canvasEl.getContext('2d')

        this.el.appendChild(this.canvasEl)

        this.setFont(options)
        this.setSize(options)
    }

    animate () {

        if (this.running) {
            return
        }

        this.running = true

        const step = (ms) => {

            if (!this.prevMs) {
                this.prevMs = ms
                requestAnimationFrame(step)
                return
            }

            const diffMs = ms - this.prevMs
            this.prevMs = ms

            if (diffMs === 0) {
                requestAnimationFrame(step)
                return
            }

            let hasAnimations = false

            for (const uniqName in this.animations) {
                const anim = this.animations[uniqName]
                if (!anim || anim.from === anim.to) {
                    this.animations[uniqName] = null
                    continue
                }
                hasAnimations = true
                anim.container[anim.prop] += (anim.to - anim.from) * diffMs / anim.duration
                if ((anim.container[anim.prop] - anim.from) / (anim.to - anim.from) >= 1) {
                    anim.container[anim.prop] = anim.to
                    anim.from = anim.to
                }
            }

            if (hasAnimations) {
                requestAnimationFrame(step)
            } else {
                this.prevMs = undefined
                this.running = false
            }

            this.render()
        }

        requestAnimationFrame(step)
    }

    render () {

    }

    addAnimation (container, prop, to, duration, uniqName) {
        this.animations[uniqName || prop] = {
            container,
            prop,
            from: container[prop],
            to,
            duration
        }
    }

    cancelAnimation (uniqName) {
        delete this.animations[uniqName]
    }

    setSize (options) {

        this.width = fromCssSize(options.width)
        this.canvasEl.width = this.width
        this.canvasEl.style.width = options.width + 'px'

        this.height = fromCssSize(options.height)
        this.canvasEl.height = this.height
        this.canvasEl.style.height = options.height + 'px'
    }

    setFont (options) {
        this.textSize = fromCssSize(options.fontSize)
        this.textFont = options.fontFamily
        this.ctxFont = this.textSize + 'px ' + options.fontFamily
        this.ctx.font = this.ctxFont
    }
}

export default AnimatedCanvas
