(function () {
    'use strict';

    class Panel {

        constructor (canvas, scrollbar, checkboxes) {
            const div = document.createElement('div');
            div.className = 'panel';
            div.appendChild(canvas.el);
            div.appendChild(scrollbar.el);
            div.appendChild(checkboxes.el);
            this.canvas = canvas;
            this.scrollbar = scrollbar;
            this.checkboxes = checkboxes;
            this.el = div;
        }

        render (parent) {
            this.canvas.render();
            this.scrollbar.render();
            this.checkboxes.render();
        }

        destroy () {
            this.el.remove();
        }
    }

    const stepSize = 0.02;
    const stepTimeMs = 8;

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];

    class Canvas {

        constructor (data, options) {

            this.data = data;
            this.decor = options.decor;

            this.x = getX(data);
            this.lines = getLines(data);

            this.el = document.createElement('div');
            this.el.className = 'chart';

            this.canvasEl = document.createElement('canvas');
            this.ctx = this.canvasEl.getContext('2d');

            this.setSize(options.width, options.height);
            this.setBasicSizes(options.padW, options.padH, options.datesDiff);

            this.currentLeft = options.from;
            this.currentRight = options.to;

            this.xDiff = this.x[this.x.length - 1] - this.x[1];

            this.lineStates = {};
            this.lineGrades = {};
            this.lineColors = {};
            for (let label in data.names) {
                this.lineStates[label] = true;
                this.lineGrades[label] = 1;
                this.lineColors[label] = toRGBA(data.colors[label]);
            }

            this.fromHeight = this.toHeight = this.currentHeight =
                this.getMaxY(options.from, options.to);
            this.heightGrade = 1;

            this.fromPeriod = this.toPeriod = 0;
            this.datesGrade = 1;

            this.el.appendChild(this.canvasEl);

            if (options.decor) {

                this.setFont(options.fontSize, options.fontFamily);

                this.legendEl = document.createElement('div');
                this.legendEl.className = 'legend';

                this.legendTitleEl = document.createElement('div');
                this.legendTitleEl.className = 'legend-title';
                this.legendTitleEl.innerText = 'Sat, Feb 24';
                this.legendEl.appendChild(this.legendTitleEl);

                this.rulerEl = document.createElement('div');
                this.rulerEl.className = 'ruler';
                this.rulerEl.style.height = this.toCssPixels(this.height - this.padH) + 'px';
                this.el.appendChild(this.rulerEl);

                this.legendLines = { els: {}, values: {}, cross: {} };
                for (let label in data.names) {

                    const lineEl = this.legendLines.els[label] = document.createElement('div');
                    lineEl.className = 'legend-line';

                    const lineValEl = this.legendLines.values[label] = document.createElement('div');
                    lineValEl.className = 'legend-value';

                    const lineLabelEl = document.createElement('div');
                    lineLabelEl.className = 'legend-label';
                    lineLabelEl.innerText = data.names[label];

                    const lineCrossEl = this.legendLines.cross[label] = document.createElement('div');
                    lineCrossEl.className = 'line-cross';
                    lineCrossEl.style['border-color'] = this.lineColors[label] + '1)';

                    this.el.appendChild(lineCrossEl);

                    lineEl.appendChild(lineValEl);
                    lineEl.appendChild(lineLabelEl);

                    lineEl.style.color = this.lineColors[label] + '1)';
                    this.legendEl.appendChild(lineEl);
                }

                this.el.appendChild(this.legendEl);

                this.el.addEventListener('mousemove', e => this.onMouseMove(e));
                this.el.addEventListener('mouseleave', () => this.hideLegend());
                this.el.addEventListener('mouseenter', () => this.showLegend());

                this.hideLegend();
            }
        }

        move (left, right) {
            this.animate(left, right);
        }

        moveLeft (left) {
            this.animate(left, this.currentRight);
        }

        moveRight (right) {
            this.animate(this.currentLeft, right);
        }

        disable (label) {
            if (this.lineStates[label]) {
                this.lineStates[label] = false;
                this.lineGrades[label] = 1 - this.lineGrades[label];
                this.animate(this.currentLeft, this.currentRight);
                if (this.decor) {
                    this.legendLines.els[label].style.display = 'none';
                    this.legendLines.cross[label].style.display = 'none';
                }
            }
        }

        enable (label) {
            if (!this.lineStates[label]) {
                this.lineStates[label] = true;
                this.lineGrades[label] = 1 - this.lineGrades[label];
                this.animate(this.currentLeft, this.currentRight);
                if (this.decor) {
                    this.legendLines.els[label].style.display = 'inline-block';
                }
            }
        }

        animate (left, right) {

            if (this.animation) {
                clearInterval(this.animation);
            }

            this.currentLeft = left;
            this.currentRight = right;

            this.animation = setInterval(() => {

                let heightDone = true, datesDone = true, linesDone = true;

                if (this.heightGrade < 1) {
                    this.heightGrade += stepSize;
                    heightDone = false;
                } else {
                    this.heightGrade = 1;
                    this.fromHeight = this.toHeight;
                }

                if (this.datesGrade < 1) {
                    this.datesGrade += stepSize;
                    datesDone = false;
                } else {
                    this.datesGrade = 1;
                    this.fromPeriod = this.toPeriod;
                }

                for (const label in this.lineGrades) {
                    if (this.lineGrades[label] < 1) {
                        this.lineGrades[label] += stepSize;
                        linesDone = false;
                    } else {
                        this.lineGrades[label] = 1;
                    }
                }

                if (heightDone && datesDone && linesDone) {
                    clearInterval(this.animation);
                }

                this.clear();
                this.render();

            }, stepTimeMs);
        }

        clear () {
            this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        }

        render () {

            const dX = this.xDiff * (this.currentRight - this.currentLeft);
            let dY = this.getMaxY(this.currentLeft, this.currentRight);

            if (this.toHeight !== dY) {
                this.heightGrade = Math.abs(this.currentHeight - this.fromHeight) / ( Math.abs(this.currentHeight - this.fromHeight) + Math.abs(dY - this.currentHeight) );
                this.toHeight = dY;
                this.fromHeight = this.currentHeight;
            }

            this.currentHeight = approximate(this.fromHeight, this.toHeight, this.heightGrade, Infinity);

            if (this.decor) {
                this.drawGrid(this.fromHeight, this.toHeight, this.currentHeight, this.heightGrade);
                this.drawDates();
            }

            this.drawLines(this.currentLeft, this.currentRight, dX, this.currentHeight);
        }

        drawGrid (from, to, current, grade) {

            const width = this.canvasEl.width - 2 * this.padW;
            const height = this.canvasEl.height - 2 * this.padH;

            this.ctx.lineWidth = this.basicThickness;
            this.ctx.strokeStyle = 'rgb(240, 240, 240)';

            this.ctx.beginPath();

            this.ctx.lineTo(this.padW, height + this.padH);
            this.ctx.lineTo(this.padW + width, height + this.padH);

            this.ctx.stroke();

            const base = this.padH + height;

            let fromValuesDiff = from / 5;
            let toValuesDiff = to / 5;
            const fromLinesDiff = height / current * fromValuesDiff;
            const toLinesDiff = height / current * toValuesDiff;

            fromValuesDiff = Math.round(fromValuesDiff);
            toValuesDiff = Math.round(toValuesDiff);

            this.ctx.fillStyle = 'rgba(146, 161, 168, ' + grade + ')';
            this.ctx.strokeStyle = 'rgba(240, 240, 240, ' + grade + ')';
            this.ctx.beginPath();

            for (
                let i = 0, y = base - toLinesDiff, val = toValuesDiff;
                i < 5;
                i++, y -= toLinesDiff, val += toValuesDiff
            ) {
                this.ctx.fillText(val, this.padW, y - this.textSize / 2);
                this.ctx.moveTo(this.padW, y);
                this.ctx.lineTo(this.padW + width, y);
            }

            this.ctx.stroke();

            if (grade < 1) {

                this.ctx.fillStyle = 'rgba(146, 161, 168, ' + (1 - grade) + ')';
                this.ctx.strokeStyle = 'rgba(240, 240, 240, ' + (1 - grade) + ')';
                this.ctx.beginPath();

                for (
                    let i = 0, y = base - fromLinesDiff, val = fromValuesDiff;
                    i < 5;
                    i++, y -= fromLinesDiff, val += fromValuesDiff
                ) {
                    this.ctx.fillText(val, this.padW, y - this.textSize / 2);
                    this.ctx.moveTo(this.padW, y);
                    this.ctx.lineTo(this.padW + width, y);
                }

                this.ctx.stroke();
            }
        }

        drawDates () {

            if (this.currentRight - this.currentLeft <= (1 / this.x.length)) {
                this.fromPeriod = 0;
                return
            }

            const width = this.canvasEl.width - 2 * this.padW;
            const height = this.canvasEl.height - 2 * this.padH;

            if (this.fromPeriod === 0) {
                this.fromPeriod = this.toPeriod =
                    this.datesDiff * (this.currentRight - this.currentLeft) / width;
            }

            const currentDiff = this.toPeriod * width / (this.currentRight - this.currentLeft);

            if (currentDiff >= 2 * this.datesDiff) {
                this.toPeriod = this.toPeriod / 2;
                this.datesGrade = 0;
            } else if (currentDiff < this.datesDiff) {
                if (this.fromPeriod < this.toPeriod) {
                    this.fromPeriod = this.fromPeriod * 2;
                }
                this.toPeriod = this.toPeriod * 2;
                this.datesGrade = 0;
            }

            const scale = width / (this.currentRight - this.currentLeft);
            const y = height + this.padH + 1.5 * this.textSize;

            if (this.fromPeriod >= this.toPeriod) {

                let n = Math.floor(this.currentLeft / this.toPeriod) - 1;

                if (this.fromPeriod > this.toPeriod) {

                    this.ctx.fillStyle = 'rgba(146, 161, 168, ' + this.datesGrade + ')';

                    for (let p = this.toPeriod * n; p < this.currentRight + this.toPeriod; p += this.toPeriod) {
                        const d = new Date(Math.floor(this.x[1] + this.xDiff * p));
                        const text = months[d.getMonth()] + ' ' + d.getDate();
                        this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y);
                    }
                }

                this.ctx.fillStyle = 'rgb(146, 161, 168)';

                n = Math.floor(this.currentLeft / this.fromPeriod) - 1;

                for (let p = this.fromPeriod * n; p < this.currentRight + this.fromPeriod; p += this.fromPeriod) {
                    const d = new Date(Math.floor(this.x[1] + this.xDiff * p));
                    const text = months[d.getMonth()] + ' ' + d.getDate();
                    this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y);
                }

            } else {

                let n = Math.floor(this.currentLeft / this.fromPeriod) - 1;

                this.ctx.fillStyle = 'rgba(146, 161, 168, ' + (1 - this.datesGrade) + ')';

                for (let p = this.fromPeriod * n; p < this.currentRight + this.fromPeriod; p += this.fromPeriod) {
                    const d = new Date(Math.floor(this.x[1] + this.xDiff * p));
                    const text = months[d.getMonth()] + ' ' + d.getDate();
                    this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y);
                }

                this.ctx.fillStyle = 'rgb(146, 161, 168)';

                n = Math.floor(this.currentLeft / this.toPeriod) - 1;

                for (let p = this.toPeriod * n; p < this.currentRight + this.toPeriod; p += this.toPeriod) {
                    const d = new Date(Math.floor(this.x[1] + this.xDiff * p));
                    const text = months[d.getMonth()] + ' ' + d.getDate();
                    this.ctx.fillText(text, this.padW + (p - this.currentLeft) * scale, y);
                }
            }
        }

        drawLines (left, right, dX, dY) {
            for (let line of this.lines) {
                if (this.lineStates[line[0]] || this.lineGrades[line[0]] < 1) {
                    this.drawLine(line, left, right, dX, dY);
                }
            }
        }

        drawLine (line, left, right, dX, dY) {

            const width = this.canvasEl.width - 2 * this.padW;
            const height = this.canvasEl.height - 2 * this.padH;

            const scaleX = width / dX;
            const scaleY = height / dY;

            this.ctx.lineWidth = 2 * this.basicThickness;
            this.ctx.strokeStyle = this.getStrokeStyle(line);

            this.ctx.beginPath();

            const initialIndex = Math.ceil((line.length - 1) * left) + 1;
            const endIndex = Math.floor((line.length - 1) * right);

            let initialX = this.x[initialIndex];
            let initialXCoord = this.padW +
                ((initialX - this.x[1]) / (this.xDiff) - left) * width / (right - left);

            let prevXCoord = initialXCoord, prevX = initialX;

            for (let i = initialIndex; i > 0; i--) {

                const x = this.x[i];
                const y = line[i];

                prevXCoord = prevXCoord + (x - prevX) * scaleX;
                this.ctx.lineTo(prevXCoord, this.padH + height - y * scaleY);

                prevX = x;

                if (prevXCoord < 0) {
                    break
                }
            }

            this.ctx.moveTo(initialXCoord, this.padH + height - line[initialIndex] * scaleY);

            for (let i = initialIndex + 1; i < line.length; i++) {

                const x = this.x[i];
                const y = line[i];

                initialXCoord = initialXCoord + (x - initialX) * scaleX;
                this.ctx.lineTo(initialXCoord, this.padH + height - y * scaleY);

                initialX = x;

                if (initialXCoord > width + this.padW * 2) {
                    break
                }
            }

            this.ctx.stroke();
        }

        showLegend () {
            let someVisible = false;
            for (const line of this.lines) {
                if (this.lineStates[line[0]]) {
                    this.legendLines.cross[line[0]].style.display = 'block';
                    someVisible = true;
                }
            }
            if (someVisible) {
                this.legendEl.style.display = 'inline-block';
                this.rulerEl.style.display = 'block';
                this.moveLegendTo(0);
            }
        }

        hideLegend () {
            this.legendEl.style.display = 'none';
            this.rulerEl.style.display = 'none';
            for (const line of this.lines) {
                this.legendLines.cross[line[0]].style.display = 'none';
            }
        }

        onMouseMove (e) {

            const leftOffset = this.el.getBoundingClientRect().left;
            const offsetLeft = this.fromCssPixels(e.clientX - leftOffset);

            this.moveLegendTo(offsetLeft);
        }

        moveLegendTo (offsetLeft) {

            const width = this.canvasEl.width - 2 * this.padW;
            const height = this.canvasEl.height - 2 * this.padH;

            let position = this.currentLeft + (offsetLeft - this.padW) / width * (this.currentRight - this.currentLeft);

            if (position < this.currentLeft) {
                position = this.currentLeft;
            } else if (position > this.currentRight) {
                position = this.currentRight;
            }

            const closestIndex = Math.max(Math.round((this.x.length - 1) * position), 1);

            const percent = (this.x[closestIndex] - this.x[1]) / this.xDiff;

            const d = new Date(Math.floor(this.x[1] + this.xDiff * percent));
            const text = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();

            const xPos = this.padW + (percent - this.currentLeft) / (this.currentRight - this.currentLeft) * width;

            const leftOffset = this.toCssPixels(xPos);

            const legendOffsetWidth = this.legendEl.offsetWidth;

            let additionalOffset = 0;

            for (const line of this.lines) {
                if (this.lineStates[line[0]]) {

                    const value = line[closestIndex];

                    const topOffset = this.toCssPixels(this.padH + height - value / this.currentHeight * height);

                    this.legendLines.values[line[0]].innerText = value;
                    this.legendLines.cross[line[0]].style.top = topOffset - 5 + 'px';
                    this.legendLines.cross[line[0]].style.left = leftOffset - 5 + 'px';
                    if (topOffset - 10 < this.legendEl.offsetHeight) {
                        additionalOffset = legendOffsetWidth / 2 + 10;
                    }
                }
            }

            let nextOffset = leftOffset - legendOffsetWidth / 2 + additionalOffset;

            if (nextOffset < 0) {
                additionalOffset = additionalOffset ? -additionalOffset : legendOffsetWidth / 2 + 10;
            }

            const rightOverflow = nextOffset + legendOffsetWidth - this.toCssPixels(width + this.padW);

            if (rightOverflow > 0) {
                additionalOffset = additionalOffset ? -additionalOffset : -legendOffsetWidth / 2 - 10;
            }

            this.rulerEl.style.left = leftOffset + 'px';
            this.legendEl.style.left = leftOffset - legendOffsetWidth / 2 + additionalOffset + 'px';

            this.legendTitleEl.innerText = text;
        }

        getMaxY (left, right) {

            let max = 0;

            for (const line of this.lines) {

                if (!this.lineStates[line[0]]) {
                    continue
                }

                const from = Math.ceil((line.length - 1) * left) + 1;
                const to = Math.ceil((line.length - 1) * right);

                for (let i = from; i < to; i++) {
                    if (line[i] > max) {
                        max = line[i];
                    }
                }
            }

            return max
        }

        getStrokeStyle (line) {
            const label = line[0];
            return this.lineStates[label]
                ? this.lineColors[label] + this.lineGrades[label] + ')'
                : this.lineColors[label] + (1 - this.lineGrades[label]) + ')'
        }

        setSize (width, height) {

            const ratio = getPixelRatio();

            this.width = width * ratio;
            this.canvasEl.width = width * ratio;
            this.canvasEl.style.width = width + 'px';

            this.height = height * ratio;
            this.canvasEl.height = height * ratio;
            this.canvasEl.style.height = height + 'px';
        }

        setFont (size, family) {
            const ratio = getPixelRatio();
            this.textSize = size * ratio;
            this.ctx.font = ratio * size + 'px ' + family;
        }

        setBasicSizes (padW, padH, datesDiff) {

            const ratio = getPixelRatio();

            this.padW = padW * ratio;
            this.padH = padH * ratio;
            this.datesDiff = datesDiff * ratio;
            this.basicThickness = ratio;
        }

        toCssPixels (value) {

            const ratio = getPixelRatio();

            return value / ratio
        }

        fromCssPixels (value) {

            const ratio = getPixelRatio();

            return value * ratio
        }
    }

    function getX (data) {
        for (let column of data.columns) {
            if (data.types[column[0]] === 'x') {
                return column
            }
        }
    }

    function getLines (data) {
        const result = [];
        for (let column of data.columns) {
            if (data.types[column[0]] === 'line') {
                result.push(column);
            }
        }
        return result
    }

    function approximate (from, to, grade, max) {

        const val = (from - ( from - to ) * grade);

        return val < 0
            ? 0
            : val > max ? max : val
    }

    function toRGBA (hex) {
        return 'rgba('
            + parseInt(hex.slice(1, 3), 16) + ','
            + parseInt(hex.slice(3, 5), 16) + ','
            + parseInt(hex.slice(5), 16) + ','
    }

    function getPixelRatio () {
        return window.devicePixelRatio || 1
    }

    let checkboxCount = 0;

    class Checkboxes {

        constructor (data, canvas, scrollCanvas) {
            this.data = data;
            this.canvas = canvas;
            this.scrollCanvas = scrollCanvas;

            this.el = document.createElement('div');
            for (let label in data.names) {

                const checkboxId = 'checkbox' + checkboxCount++;

                const checkboxEl = document.createElement('div');
                checkboxEl.className = 'checkbox';

                const checkEl = document.createElement('input');
                checkEl.className = 'check';
                checkEl.type = 'checkbox';
                checkEl.id = checkboxId;
                checkEl.addEventListener('click', (e) => this.onCheck(label, checkEl));

                const checkSignEl = document.createElement('div');
                checkSignEl.className = 'sign';

                const checkSignBgEl = document.createElement('div');
                checkSignBgEl.className = 'sign-bg';
                checkSignBgEl.style['border-color'] = data.colors[label];

                const labelEl = document.createElement('label');
                labelEl.className = 'label';
                labelEl.htmlFor = checkboxId;
                labelEl.innerText = data.names[label];

                checkboxEl.appendChild(checkEl);
                checkboxEl.appendChild(checkSignBgEl);
                checkboxEl.appendChild(checkSignEl);
                checkboxEl.appendChild(labelEl);
                this.el.appendChild(checkboxEl);
            }
        }

        render () {}

        onCheck (label, checkboxEl) {
            if (checkboxEl.checked) {
                this.canvas.disable(label);
                this.scrollCanvas.disable(label);
            } else {
                this.canvas.enable(label);
                this.scrollCanvas.enable(label);
            }
        }
    }

    class Scrollbar {

        constructor (data, canvas, scrollCanvas, options) {
            this.data = data;
            this.canvas = canvas;
            this.scrollCanvas = scrollCanvas;

            this.el = document.createElement('div');
            this.el.className = 'scroll';
            this.leftAreaEl = document.createElement('div');
            this.leftAreaEl.className = 'left_area';
            this.rightAreaEl = document.createElement('div');
            this.rightAreaEl.className = 'right_area';
            this.scrollBoxEl = document.createElement('div');
            this.scrollBoxEl.className = 'scroll-box';
            this.scrollBoxLeftBorderEl = document.createElement('div');
            this.scrollBoxLeftBorderEl.className = 'scroll-box-border-left';
            this.scrollBoxRightBorderEl = document.createElement('div');
            this.scrollBoxRightBorderEl.className = 'scroll-box-border-right';

            this.scrollBoxEl.appendChild(this.scrollBoxLeftBorderEl);
            this.scrollBoxEl.appendChild(this.scrollBoxRightBorderEl);

            this.el.appendChild(scrollCanvas.el);
            this.el.appendChild(this.leftAreaEl);
            this.el.appendChild(this.rightAreaEl);
            this.el.appendChild(this.scrollBoxEl);

            this.from = options.from;
            this.to = options.to;
            this.padW = options.padW;
            this.border = options.border;

            this.move = 'no';

            this.scrollBoxEl.addEventListener('mousedown', e => this.onMoveBoth(e));
            this.scrollBoxLeftBorderEl.addEventListener('mousedown', e => this.onMoveLeft(e));
            this.scrollBoxRightBorderEl.addEventListener('mousedown', e => this.onMoveRight(e));
            this.el.addEventListener('mouseup', e => this.onMouseUp(e));
            this.el.addEventListener('mouseleave', e => this.onMouseUp(e));
            this.el.addEventListener('mousemove', e => this.onMouseMove(e));
            // this.scrollBoxLeftBorderEl.addEventListener('mousemove', e => this.onMouseMove(e))
            // this.scrollBoxRightBorderEl.addEventListener('mousemove', e => this.onMouseMove(e))
        }

        render () {
            this.scrollCanvas.render();
            this.drawAreas();
            this.drawScrollBox();
        }

        drawAreas () {
            const scrollWidth = this.el.offsetWidth - 2 * this.padW;
            this.leftAreaEl.style.width = (scrollWidth * this.from) + 'px';
            this.leftAreaEl.style.left = (this.padW) + 'px';
            this.rightAreaEl.style.width = (scrollWidth * (1 - this.to)) + 'px';
            this.rightAreaEl.style.left = (this.padW + this.to * scrollWidth) + 'px';
        }

        drawScrollBox () {
            const scrollWidth = this.el.offsetWidth - 2 * this.padW;
            this.scrollBoxEl.style.width = ((this.to - this.from) * scrollWidth) + 'px';
            this.scrollBoxEl.style.left = (this.padW + this.from * scrollWidth) + 'px';
        }

        onMoveBoth (e) {
            this.move = 'both';
            this.leftOffset = e.clientX - this.scrollBoxEl.offsetLeft;
            this.lastWidth = this.scrollBoxEl.offsetWidth;
            e.stopPropagation();
            return true
        }

        onMoveLeft (e) {
            this.move = 'left';
            this.leftOffset = e.clientX - this.scrollBoxEl.offsetLeft;
            this.lastWidth = this.scrollBoxEl.offsetWidth;
            e.stopPropagation();
            return true
        }

        onMoveRight (e) {
            this.move = 'right';
            this.leftOffset = e.clientX - this.scrollBoxEl.offsetLeft;
            this.lastWidth = this.scrollBoxEl.offsetWidth;
            e.stopPropagation();
            return true
        }

        onMouseUp (e) {
            this.move = 'no';
        }

        onMouseMove (e) {

            if (this.move === 'no') {
                return
            }

            const scrollWidth = this.el.offsetWidth - 2 * this.padW;
            const currentLeftOffset = e.clientX - this.scrollBoxEl.offsetLeft;

            const offsetDiff = currentLeftOffset - this.leftOffset;
            const dOffset = offsetDiff / scrollWidth;
            if (this.move === 'left') {
                this.from += dOffset;
                if (this.from > this.to) {
                    this.from = this.to;
                }
            } else if (this.move === 'right') {
                const dOffset = (offsetDiff - this.scrollBoxEl.offsetWidth + this.lastWidth) / scrollWidth;
                this.to += dOffset;
                if (this.from > this.to) {
                    this.to = this.from;
                }
            } else {
                if (this.to < 1) {
                    this.from += dOffset;
                }
                if (this.from > 0) {
                    this.to += dOffset;
                }
            }

            if (this.from < 0) {
                this.from = 0;
            }

            if (this.to > 1) {
                this.to = 1;
            }

            this.drawAreas();
            this.drawScrollBox();
            this.canvas.move(this.from, this.to);
        }
    }

    function ChartFactory (Panel, Canvas, Scrollbar, Checkboxes) {

        return {

            create: function (data, parent) {

                const canvas = new Canvas(data, {
                    padW: 10,
                    padH: 20,
                    decor: true,
                    width: 300,
                    height: 320,
                    from: 0.75,
                    to: 1,
                    datesDiff: 60,
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 10,
                });

                const scrollCanvas = new Canvas(data, {
                    padW: 10,
                    padH: 4,
                    decor: false,
                    width: 300,
                    height: 32,
                    from: 0,
                    to: 1,
                });

                const scrollbar = new Scrollbar(data, canvas, scrollCanvas, {
                    from: 0.75,
                    to: 1,
                    padW: 10,
                    border: 10,
                });

                const checkboxes = new Checkboxes(data, canvas, scrollCanvas);

                const panel = new Panel(canvas, scrollbar, checkboxes);

                parent.appendChild(panel.el);
                panel.render();

                return panel
            },
        }
    }

    var data = [
        {
            "columns": [
                [
                    "x",
                    1542412800000,
                    1542499200000,
                    1542585600000,
                    1542672000000,
                    1542758400000,
                    1542844800000,
                    1542931200000,
                    1543017600000,
                    1543104000000,
                    1543190400000,
                    1543276800000,
                    1543363200000,
                    1543449600000,
                    1543536000000,
                    1543622400000,
                    1543708800000,
                    1543795200000,
                    1543881600000,
                    1543968000000,
                    1544054400000,
                    1544140800000,
                    1544227200000,
                    1544313600000,
                    1544400000000,
                    1544486400000,
                    1544572800000,
                    1544659200000,
                    1544745600000,
                    1544832000000,
                    1544918400000,
                    1545004800000,
                    1545091200000,
                    1545177600000,
                    1545264000000,
                    1545350400000,
                    1545436800000,
                    1545523200000,
                    1545609600000,
                    1545696000000,
                    1545782400000,
                    1545868800000,
                    1545955200000,
                    1546041600000,
                    1546128000000,
                    1546214400000,
                    1546300800000,
                    1546387200000,
                    1546473600000,
                    1546560000000,
                    1546646400000,
                    1546732800000,
                    1546819200000,
                    1546905600000,
                    1546992000000,
                    1547078400000,
                    1547164800000,
                    1547251200000,
                    1547337600000,
                    1547424000000,
                    1547510400000,
                    1547596800000,
                    1547683200000,
                    1547769600000,
                    1547856000000,
                    1547942400000,
                    1548028800000,
                    1548115200000,
                    1548201600000,
                    1548288000000,
                    1548374400000,
                    1548460800000,
                    1548547200000,
                    1548633600000,
                    1548720000000,
                    1548806400000,
                    1548892800000,
                    1548979200000,
                    1549065600000,
                    1549152000000,
                    1549238400000,
                    1549324800000,
                    1549411200000,
                    1549497600000,
                    1549584000000,
                    1549670400000,
                    1549756800000,
                    1549843200000,
                    1549929600000,
                    1550016000000,
                    1550102400000,
                    1550188800000,
                    1550275200000,
                    1550361600000,
                    1550448000000,
                    1550534400000,
                    1550620800000,
                    1550707200000,
                    1550793600000,
                    1550880000000,
                    1550966400000,
                    1551052800000,
                    1551139200000,
                    1551225600000,
                    1551312000000,
                    1551398400000,
                    1551484800000,
                    1551571200000,
                    1551657600000,
                    1551744000000,
                    1551830400000,
                    1551916800000,
                    1552003200000
                ],
                [
                    "y0",
                    37,
                    20,
                    32,
                    39,
                    32,
                    35,
                    19,
                    65,
                    36,
                    62,
                    113,
                    69,
                    120,
                    60,
                    51,
                    49,
                    71,
                    122,
                    149,
                    69,
                    57,
                    21,
                    33,
                    55,
                    92,
                    62,
                    47,
                    50,
                    56,
                    116,
                    63,
                    60,
                    55,
                    65,
                    76,
                    33,
                    45,
                    64,
                    54,
                    81,
                    180,
                    123,
                    106,
                    37,
                    60,
                    70,
                    46,
                    68,
                    46,
                    51,
                    33,
                    57,
                    75,
                    70,
                    95,
                    70,
                    50,
                    68,
                    63,
                    66,
                    53,
                    38,
                    52,
                    109,
                    121,
                    53,
                    36,
                    71,
                    96,
                    55,
                    58,
                    29,
                    31,
                    55,
                    52,
                    44,
                    126,
                    191,
                    73,
                    87,
                    255,
                    278,
                    219,
                    170,
                    129,
                    125,
                    126,
                    84,
                    65,
                    53,
                    154,
                    57,
                    71,
                    64,
                    75,
                    72,
                    39,
                    47,
                    52,
                    73,
                    89,
                    156,
                    86,
                    105,
                    88,
                    45,
                    33,
                    56,
                    142,
                    124,
                    114,
                    64
                ],
                [
                    "y1",
                    22,
                    12,
                    30,
                    40,
                    33,
                    23,
                    18,
                    41,
                    45,
                    69,
                    57,
                    61,
                    70,
                    47,
                    31,
                    34,
                    40,
                    55,
                    27,
                    57,
                    48,
                    32,
                    40,
                    49,
                    54,
                    49,
                    34,
                    51,
                    51,
                    51,
                    66,
                    51,
                    94,
                    60,
                    64,
                    28,
                    44,
                    96,
                    49,
                    73,
                    30,
                    88,
                    63,
                    42,
                    56,
                    67,
                    52,
                    67,
                    35,
                    61,
                    40,
                    55,
                    63,
                    61,
                    105,
                    59,
                    51,
                    76,
                    63,
                    57,
                    47,
                    56,
                    51,
                    98,
                    103,
                    62,
                    54,
                    104,
                    48,
                    41,
                    41,
                    37,
                    30,
                    28,
                    26,
                    37,
                    65,
                    86,
                    70,
                    81,
                    54,
                    74,
                    70,
                    50,
                    74,
                    79,
                    85,
                    62,
                    36,
                    46,
                    68,
                    43,
                    66,
                    50,
                    28,
                    66,
                    39,
                    23,
                    63,
                    74,
                    83,
                    66,
                    40,
                    60,
                    29,
                    36,
                    27,
                    54,
                    89,
                    50,
                    73,
                    52
                ]
            ],
            "types": {
                "y0": "line",
                "y1": "line",
                "x": "x"
            },
            "names": {
                "y0": "#0",
                "y1": "#1"
            },
            "colors": {
                "y0": "#3DC23F",
                "y1": "#F34C44"
            }
        },
        {
            "columns": [
                [
                    "x",
                    1542412800000,
                    1542499200000,
                    1542585600000,
                    1542672000000,
                    1542758400000,
                    1542844800000,
                    1542931200000,
                    1543017600000,
                    1543104000000,
                    1543190400000,
                    1543276800000,
                    1543363200000,
                    1543449600000,
                    1543536000000,
                    1543622400000,
                    1543708800000,
                    1543795200000,
                    1543881600000,
                    1543968000000,
                    1544054400000,
                    1544140800000,
                    1544227200000,
                    1544313600000,
                    1544400000000,
                    1544486400000,
                    1544572800000,
                    1544659200000,
                    1544745600000,
                    1544832000000,
                    1544918400000,
                    1545004800000,
                    1545091200000,
                    1545177600000,
                    1545264000000,
                    1545350400000,
                    1545436800000,
                    1545523200000,
                    1545609600000,
                    1545696000000,
                    1545782400000,
                    1545868800000,
                    1545955200000,
                    1546041600000,
                    1546128000000,
                    1546214400000,
                    1546300800000,
                    1546387200000,
                    1546473600000,
                    1546560000000,
                    1546646400000,
                    1546732800000,
                    1546819200000,
                    1546905600000,
                    1546992000000,
                    1547078400000,
                    1547164800000,
                    1547251200000,
                    1547337600000,
                    1547424000000,
                    1547510400000,
                    1547596800000,
                    1547683200000,
                    1547769600000,
                    1547856000000,
                    1547942400000,
                    1548028800000,
                    1548115200000,
                    1548201600000,
                    1548288000000,
                    1548374400000,
                    1548460800000,
                    1548547200000,
                    1548633600000,
                    1548720000000,
                    1548806400000,
                    1548892800000,
                    1548979200000,
                    1549065600000,
                    1549152000000,
                    1549238400000,
                    1549324800000,
                    1549411200000,
                    1549497600000,
                    1549584000000,
                    1549670400000,
                    1549756800000,
                    1549843200000,
                    1549929600000,
                    1550016000000,
                    1550102400000,
                    1550188800000,
                    1550275200000,
                    1550361600000,
                    1550448000000,
                    1550534400000,
                    1550620800000,
                    1550707200000,
                    1550793600000,
                    1550880000000,
                    1550966400000,
                    1551052800000,
                    1551139200000,
                    1551225600000,
                    1551312000000,
                    1551398400000,
                    1551484800000,
                    1551571200000,
                    1551657600000,
                    1551744000000,
                    1551830400000,
                    1551916800000,
                    1552003200000
                ],
                [
                    "y0",
                    6706,
                    7579,
                    7798,
                    8307,
                    7866,
                    7736,
                    7816,
                    7630,
                    7536,
                    7105,
                    7178,
                    7619,
                    7917,
                    7483,
                    5772,
                    5700,
                    5435,
                    4837,
                    4716,
                    4890,
                    4753,
                    4820,
                    4538,
                    12162,
                    39444,
                    25765,
                    18012,
                    14421,
                    13249,
                    11310,
                    10377,
                    9399,
                    8917,
                    8259,
                    7902,
                    9442,
                    47596,
                    36160,
                    23866,
                    18500,
                    15488,
                    13722,
                    12270,
                    13413,
                    10574,
                    7092,
                    7159,
                    7880,
                    8821,
                    8306,
                    7780,
                    7963,
                    7837,
                    7611,
                    7334,
                    7413,
                    7015,
                    6742,
                    6557,
                    6593,
                    6680,
                    6725,
                    6345,
                    5988,
                    6365,
                    9911,
                    28833,
                    19694,
                    14873,
                    11911,
                    10498,
                    9708,
                    8893,
                    8365,
                    7960,
                    7694,
                    45529,
                    42858,
                    31508,
                    23289,
                    19147,
                    15874,
                    14551,
                    13124,
                    11778,
                    10809,
                    10522,
                    9918,
                    9436,
                    8617,
                    8765,
                    8194,
                    8035,
                    7865,
                    7573,
                    7422,
                    7047,
                    7147,
                    6861,
                    6669,
                    6363,
                    12073,
                    32381,
                    21390,
                    15311,
                    12819,
                    11655,
                    10696,
                    9678,
                    9143,
                    8296,
                    7852
                ],
                [
                    "y1",
                    3522,
                    4088,
                    4146,
                    4477,
                    4202,
                    4157,
                    4177,
                    4203,
                    4223,
                    3948,
                    3946,
                    3898,
                    3979,
                    4052,
                    3279,
                    3229,
                    3302,
                    3040,
                    3054,
                    2982,
                    3077,
                    2965,
                    2973,
                    5148,
                    22485,
                    13077,
                    9055,
                    7446,
                    6824,
                    5995,
                    5787,
                    5367,
                    4997,
                    4689,
                    4630,
                    4785,
                    22365,
                    15244,
                    10626,
                    8666,
                    7681,
                    6929,
                    6219,
                    6367,
                    5402,
                    4932,
                    4844,
                    5146,
                    5265,
                    4887,
                    4714,
                    4722,
                    4718,
                    4693,
                    4746,
                    4819,
                    4455,
                    4419,
                    4323,
                    4407,
                    4277,
                    11589,
                    6100,
                    5076,
                    4769,
                    8929,
                    14002,
                    9756,
                    7520,
                    6343,
                    5633,
                    5415,
                    5052,
                    4850,
                    4624,
                    4480,
                    14102,
                    24005,
                    14263,
                    10845,
                    9028,
                    7755,
                    7197,
                    7001,
                    6737,
                    6254,
                    6150,
                    5922,
                    5603,
                    5048,
                    5423,
                    5003,
                    5035,
                    4747,
                    4814,
                    4661,
                    4462,
                    4516,
                    4221,
                    4111,
                    4053,
                    12515,
                    15781,
                    10499,
                    8175,
                    6831,
                    6287,
                    5990,
                    5590,
                    5148,
                    4760,
                    4809
                ]
            ],
            "types": {
                "y0": "line",
                "y1": "line",
                "x": "x"
            },
            "names": {
                "y0": "#0",
                "y1": "#1"
            },
            "colors": {
                "y0": "#3DC23F",
                "y1": "#F34C44"
            }
        },
        {
            "columns": [
                [
                    "x",
                    1542412800000,
                    1542499200000,
                    1542585600000,
                    1542672000000,
                    1542758400000,
                    1542844800000,
                    1542931200000,
                    1543017600000,
                    1543104000000,
                    1543190400000,
                    1543276800000,
                    1543363200000,
                    1543449600000,
                    1543536000000,
                    1543622400000,
                    1543708800000,
                    1543795200000,
                    1543881600000,
                    1543968000000,
                    1544054400000,
                    1544140800000,
                    1544227200000,
                    1544313600000,
                    1544400000000,
                    1544486400000,
                    1544572800000,
                    1544659200000,
                    1544745600000,
                    1544832000000,
                    1544918400000,
                    1545004800000,
                    1545091200000,
                    1545177600000,
                    1545264000000,
                    1545350400000,
                    1545436800000,
                    1545523200000,
                    1545609600000,
                    1545696000000,
                    1545782400000,
                    1545868800000,
                    1545955200000,
                    1546041600000,
                    1546128000000,
                    1546214400000,
                    1546300800000,
                    1546387200000,
                    1546473600000,
                    1546560000000,
                    1546646400000,
                    1546732800000,
                    1546819200000,
                    1546905600000,
                    1546992000000,
                    1547078400000,
                    1547164800000,
                    1547251200000,
                    1547337600000,
                    1547424000000,
                    1547510400000,
                    1547596800000,
                    1547683200000,
                    1547769600000,
                    1547856000000,
                    1547942400000,
                    1548028800000,
                    1548115200000,
                    1548201600000,
                    1548288000000,
                    1548374400000,
                    1548460800000,
                    1548547200000,
                    1548633600000,
                    1548720000000,
                    1548806400000,
                    1548892800000,
                    1548979200000,
                    1549065600000,
                    1549152000000,
                    1549238400000,
                    1549324800000,
                    1549411200000,
                    1549497600000,
                    1549584000000,
                    1549670400000,
                    1549756800000,
                    1549843200000,
                    1549929600000,
                    1550016000000,
                    1550102400000,
                    1550188800000,
                    1550275200000,
                    1550361600000,
                    1550448000000,
                    1550534400000,
                    1550620800000,
                    1550707200000,
                    1550793600000,
                    1550880000000,
                    1550966400000,
                    1551052800000,
                    1551139200000,
                    1551225600000,
                    1551312000000,
                    1551398400000,
                    1551484800000,
                    1551571200000,
                    1551657600000,
                    1551744000000,
                    1551830400000,
                    1551916800000,
                    1552003200000
                ],
                [
                    "y0",
                    4747,
                    4849,
                    5045,
                    5184,
                    5746,
                    5400,
                    5424,
                    5576,
                    6436,
                    5337,
                    4840,
                    5379,
                    4678,
                    4736,
                    5074,
                    4897,
                    4349,
                    5089,
                    4543,
                    5033,
                    5047,
                    4871,
                    4812,
                    4723,
                    4545,
                    4723,
                    4721,
                    4384,
                    4277,
                    4682,
                    4805,
                    4001,
                    4610,
                    5241,
                    5113,
                    4059,
                    4529,
                    4673,
                    5291,
                    5154,
                    5123,
                    5535,
                    5540,
                    5161,
                    5666,
                    5584,
                    6999,
                    6854,
                    5083,
                    5361,
                    5863,
                    5792,
                    5586,
                    6106,
                    5481,
                    5532,
                    5853,
                    5809,
                    6244,
                    6156,
                    5596,
                    5426,
                    5422,
                    5413,
                    4795,
                    5113,
                    5279,
                    5530,
                    4939,
                    4983,
                    4984,
                    5527,
                    5765,
                    5001,
                    5818,
                    6061,
                    5956,
                    5288,
                    5837,
                    5703,
                    5440,
                    5238,
                    5957,
                    6432,
                    6389,
                    6064,
                    7065,
                    5981,
                    5779,
                    6567,
                    6320,
                    5634,
                    6023,
                    5702,
                    6066,
                    5797,
                    6163,
                    6182,
                    4906,
                    5637,
                    7073,
                    6679,
                    5831,
                    6015,
                    6266,
                    6128,
                    6156,
                    6218,
                    6050,
                    6140,
                    5877,
                    7147
                ],
                [
                    "y1",
                    4605,
                    5036,
                    4956,
                    5168,
                    5008,
                    5069,
                    5223,
                    5360,
                    5695,
                    5209,
                    4796,
                    5028,
                    4931,
                    5123,
                    4987,
                    4964,
                    4982,
                    5037,
                    5050,
                    5144,
                    5049,
                    4971,
                    4911,
                    4792,
                    4562,
                    4597,
                    4759,
                    4761,
                    4646,
                    4543,
                    4597,
                    4428,
                    4213,
                    4270,
                    3961,
                    4784,
                    4699,
                    4711,
                    4855,
                    4717,
                    4563,
                    4923,
                    5041,
                    4895,
                    4877,
                    5001,
                    5410,
                    5033,
                    5045,
                    5184,
                    4976,
                    5207,
                    5354,
                    5205,
                    4887,
                    4831,
                    5083,
                    5148,
                    5369,
                    5176,
                    5022,
                    4880,
                    4969,
                    5135,
                    4836,
                    4764,
                    4782,
                    4783,
                    4646,
                    4755,
                    4744,
                    4932,
                    5059,
                    4851,
                    4614,
                    4718,
                    5018,
                    5034,
                    5223,
                    5007,
                    4839,
                    4763,
                    4761,
                    5048,
                    5330,
                    5106,
                    5956,
                    5135,
                    5006,
                    4919,
                    5511,
                    5114,
                    5122,
                    5314,
                    5089,
                    5022,
                    4918,
                    4986,
                    4626,
                    4675,
                    4951,
                    4921,
                    5173,
                    5145,
                    5209,
                    4967,
                    5030,
                    5120,
                    5030,
                    4946,
                    4795,
                    5224
                ]
            ],
            "types": {
                "y0": "line",
                "y1": "line",
                "x": "x"
            },
            "names": {
                "y0": "#0",
                "y1": "#1"
            },
            "colors": {
                "y0": "#3DC23F",
                "y1": "#F34C44"
            }
        },
        {
            "columns": [
                [
                    "x",
                    1542412800000,
                    1542499200000,
                    1542585600000,
                    1542672000000,
                    1542758400000,
                    1542844800000,
                    1542931200000,
                    1543017600000,
                    1543104000000,
                    1543190400000,
                    1543276800000,
                    1543363200000,
                    1543449600000,
                    1543536000000,
                    1543622400000,
                    1543708800000,
                    1543795200000,
                    1543881600000,
                    1543968000000,
                    1544054400000,
                    1544140800000,
                    1544227200000,
                    1544313600000,
                    1544400000000,
                    1544486400000,
                    1544572800000,
                    1544659200000,
                    1544745600000,
                    1544832000000,
                    1544918400000,
                    1545004800000,
                    1545091200000,
                    1545177600000,
                    1545264000000,
                    1545350400000,
                    1545436800000,
                    1545523200000,
                    1545609600000,
                    1545696000000,
                    1545782400000,
                    1545868800000,
                    1545955200000,
                    1546041600000,
                    1546128000000,
                    1546214400000,
                    1546300800000,
                    1546387200000,
                    1546473600000,
                    1546560000000,
                    1546646400000,
                    1546732800000,
                    1546819200000,
                    1546905600000,
                    1546992000000,
                    1547078400000,
                    1547164800000,
                    1547251200000,
                    1547337600000,
                    1547424000000,
                    1547510400000,
                    1547596800000,
                    1547683200000,
                    1547769600000,
                    1547856000000,
                    1547942400000,
                    1548028800000,
                    1548115200000,
                    1548201600000,
                    1548288000000,
                    1548374400000,
                    1548460800000,
                    1548547200000,
                    1548633600000,
                    1548720000000,
                    1548806400000,
                    1548892800000,
                    1548979200000,
                    1549065600000,
                    1549152000000,
                    1549238400000,
                    1549324800000,
                    1549411200000,
                    1549497600000,
                    1549584000000,
                    1549670400000,
                    1549756800000,
                    1549843200000,
                    1549929600000,
                    1550016000000,
                    1550102400000,
                    1550188800000,
                    1550275200000,
                    1550361600000,
                    1550448000000,
                    1550534400000,
                    1550620800000,
                    1550707200000,
                    1550793600000,
                    1550880000000,
                    1550966400000,
                    1551052800000,
                    1551139200000,
                    1551225600000,
                    1551312000000,
                    1551398400000,
                    1551484800000,
                    1551571200000,
                    1551657600000,
                    1551744000000,
                    1551830400000,
                    1551916800000,
                    1552003200000
                ],
                [
                    "y0",
                    41,
                    31,
                    62,
                    65,
                    66,
                    79,
                    52,
                    26,
                    42,
                    68,
                    71,
                    86,
                    65,
                    54,
                    33,
                    70,
                    52,
                    68,
                    75,
                    92,
                    69,
                    28,
                    33,
                    84,
                    65,
                    56,
                    42,
                    44,
                    26,
                    34,
                    45,
                    49,
                    83,
                    83,
                    66,
                    31,
                    43,
                    55,
                    57,
                    55,
                    54,
                    45,
                    51,
                    64,
                    27,
                    19,
                    38,
                    38,
                    44,
                    49,
                    42,
                    50,
                    60,
                    73,
                    86,
                    65,
                    51,
                    54,
                    48,
                    61,
                    82,
                    83,
                    53,
                    52,
                    48,
                    64,
                    96,
                    103,
                    68,
                    73,
                    58,
                    42,
                    81,
                    80,
                    76,
                    106,
                    93,
                    65,
                    69,
                    104,
                    75,
                    79,
                    92,
                    73,
                    49,
                    63,
                    76,
                    79,
                    83,
                    70,
                    55,
                    47,
                    42,
                    111,
                    93,
                    74,
                    99,
                    107,
                    52,
                    65,
                    80,
                    82,
                    74,
                    154,
                    106,
                    39,
                    40,
                    77,
                    85,
                    66,
                    52,
                    25
                ],
                [
                    "y1",
                    19,
                    10,
                    36,
                    41,
                    28,
                    39,
                    24,
                    16,
                    14,
                    40,
                    39,
                    37,
                    47,
                    28,
                    16,
                    32,
                    25,
                    29,
                    36,
                    45,
                    38,
                    11,
                    25,
                    37,
                    35,
                    22,
                    25,
                    30,
                    16,
                    20,
                    32,
                    34,
                    37,
                    26,
                    31,
                    10,
                    19,
                    32,
                    34,
                    23,
                    25,
                    22,
                    21,
                    18,
                    11,
                    18,
                    18,
                    23,
                    11,
                    18,
                    22,
                    19,
                    27,
                    27,
                    30,
                    25,
                    27,
                    23,
                    28,
                    30,
                    23,
                    31,
                    27,
                    16,
                    30,
                    21,
                    36,
                    33,
                    25,
                    34,
                    16,
                    24,
                    37,
                    33,
                    26,
                    24,
                    31,
                    21,
                    37,
                    32,
                    35,
                    31,
                    30,
                    27,
                    15,
                    17,
                    38,
                    40,
                    32,
                    34,
                    30,
                    17,
                    21,
                    28,
                    36,
                    30,
                    24,
                    25,
                    20,
                    24,
                    22,
                    42,
                    34,
                    47,
                    40,
                    29,
                    29,
                    31,
                    39,
                    30,
                    29,
                    18
                ]
            ],
            "types": {
                "y0": "line",
                "y1": "line",
                "x": "x"
            },
            "names": {
                "y0": "#0",
                "y1": "#1"
            },
            "colors": {
                "y0": "#3DC23F",
                "y1": "#F34C44"
            }
        },
        {
            "columns": [
                [
                    "x",
                    1520035200000,
                    1520121600000,
                    1520208000000,
                    1520294400000,
                    1520380800000,
                    1520467200000,
                    1520553600000,
                    1520640000000,
                    1520726400000,
                    1520812800000,
                    1520899200000,
                    1520985600000,
                    1521072000000,
                    1521158400000,
                    1521244800000,
                    1521331200000,
                    1521417600000,
                    1521504000000,
                    1521590400000,
                    1521676800000,
                    1521763200000,
                    1521849600000,
                    1521936000000,
                    1522022400000,
                    1522108800000,
                    1522195200000,
                    1522281600000,
                    1522368000000,
                    1522454400000,
                    1522540800000,
                    1522627200000,
                    1522713600000,
                    1522800000000,
                    1522886400000,
                    1522972800000,
                    1523059200000,
                    1523145600000,
                    1523232000000,
                    1523318400000,
                    1523404800000,
                    1523491200000,
                    1523577600000,
                    1523664000000,
                    1523750400000,
                    1523836800000,
                    1523923200000,
                    1524009600000,
                    1524096000000,
                    1524182400000,
                    1524268800000,
                    1524355200000,
                    1524441600000,
                    1524528000000,
                    1524614400000,
                    1524700800000,
                    1524787200000,
                    1524873600000,
                    1524960000000,
                    1525046400000,
                    1525132800000,
                    1525219200000,
                    1525305600000,
                    1525392000000,
                    1525478400000,
                    1525564800000,
                    1525651200000,
                    1525737600000,
                    1525824000000,
                    1525910400000,
                    1525996800000,
                    1526083200000,
                    1526169600000,
                    1526256000000,
                    1526342400000,
                    1526428800000,
                    1526515200000,
                    1526601600000,
                    1526688000000,
                    1526774400000,
                    1526860800000,
                    1526947200000,
                    1527033600000,
                    1527120000000,
                    1527206400000,
                    1527292800000,
                    1527379200000,
                    1527465600000,
                    1527552000000,
                    1527638400000,
                    1527724800000,
                    1527811200000,
                    1527897600000,
                    1527984000000,
                    1528070400000,
                    1528156800000,
                    1528243200000,
                    1528329600000,
                    1528416000000,
                    1528502400000,
                    1528588800000,
                    1528675200000,
                    1528761600000,
                    1528848000000,
                    1528934400000,
                    1529020800000,
                    1529107200000,
                    1529193600000,
                    1529280000000,
                    1529366400000,
                    1529452800000,
                    1529539200000,
                    1529625600000,
                    1529712000000,
                    1529798400000,
                    1529884800000,
                    1529971200000,
                    1530057600000,
                    1530144000000,
                    1530230400000,
                    1530316800000,
                    1530403200000,
                    1530489600000,
                    1530576000000,
                    1530662400000,
                    1530748800000,
                    1530835200000,
                    1530921600000,
                    1531008000000,
                    1531094400000,
                    1531180800000,
                    1531267200000,
                    1531353600000,
                    1531440000000,
                    1531526400000,
                    1531612800000,
                    1531699200000,
                    1531785600000,
                    1531872000000,
                    1531958400000,
                    1532044800000,
                    1532131200000,
                    1532217600000,
                    1532304000000,
                    1532390400000,
                    1532476800000,
                    1532563200000,
                    1532649600000,
                    1532736000000,
                    1532822400000,
                    1532908800000,
                    1532995200000,
                    1533081600000,
                    1533168000000,
                    1533254400000,
                    1533340800000,
                    1533427200000,
                    1533513600000,
                    1533600000000,
                    1533686400000,
                    1533772800000,
                    1533859200000,
                    1533945600000,
                    1534032000000,
                    1534118400000,
                    1534204800000,
                    1534291200000,
                    1534377600000,
                    1534464000000,
                    1534550400000,
                    1534636800000,
                    1534723200000,
                    1534809600000,
                    1534896000000,
                    1534982400000,
                    1535068800000,
                    1535155200000,
                    1535241600000,
                    1535328000000,
                    1535414400000,
                    1535500800000,
                    1535587200000,
                    1535673600000,
                    1535760000000,
                    1535846400000,
                    1535932800000,
                    1536019200000,
                    1536105600000,
                    1536192000000,
                    1536278400000,
                    1536364800000,
                    1536451200000,
                    1536537600000,
                    1536624000000,
                    1536710400000,
                    1536796800000,
                    1536883200000,
                    1536969600000,
                    1537056000000,
                    1537142400000,
                    1537228800000,
                    1537315200000,
                    1537401600000,
                    1537488000000,
                    1537574400000,
                    1537660800000,
                    1537747200000,
                    1537833600000,
                    1537920000000,
                    1538006400000,
                    1538092800000,
                    1538179200000,
                    1538265600000,
                    1538352000000,
                    1538438400000,
                    1538524800000,
                    1538611200000,
                    1538697600000,
                    1538784000000,
                    1538870400000,
                    1538956800000,
                    1539043200000,
                    1539129600000,
                    1539216000000,
                    1539302400000,
                    1539388800000,
                    1539475200000,
                    1539561600000,
                    1539648000000,
                    1539734400000,
                    1539820800000,
                    1539907200000,
                    1539993600000,
                    1540080000000,
                    1540166400000,
                    1540252800000,
                    1540339200000,
                    1540425600000,
                    1540512000000,
                    1540598400000,
                    1540684800000,
                    1540771200000,
                    1540857600000,
                    1540944000000,
                    1541030400000,
                    1541116800000,
                    1541203200000,
                    1541289600000,
                    1541376000000,
                    1541462400000,
                    1541548800000,
                    1541635200000,
                    1541721600000,
                    1541808000000,
                    1541894400000,
                    1541980800000,
                    1542067200000,
                    1542153600000,
                    1542240000000,
                    1542326400000,
                    1542412800000,
                    1542499200000,
                    1542585600000,
                    1542672000000,
                    1542758400000,
                    1542844800000,
                    1542931200000,
                    1543017600000,
                    1543104000000,
                    1543190400000,
                    1543276800000,
                    1543363200000,
                    1543449600000,
                    1543536000000,
                    1543622400000,
                    1543708800000,
                    1543795200000,
                    1543881600000,
                    1543968000000,
                    1544054400000,
                    1544140800000,
                    1544227200000,
                    1544313600000,
                    1544400000000,
                    1544486400000,
                    1544572800000,
                    1544659200000,
                    1544745600000,
                    1544832000000,
                    1544918400000,
                    1545004800000,
                    1545091200000,
                    1545177600000,
                    1545264000000,
                    1545350400000,
                    1545436800000,
                    1545523200000,
                    1545609600000,
                    1545696000000,
                    1545782400000,
                    1545868800000,
                    1545955200000,
                    1546041600000,
                    1546128000000,
                    1546214400000,
                    1546300800000,
                    1546387200000,
                    1546473600000,
                    1546560000000,
                    1546646400000,
                    1546732800000,
                    1546819200000,
                    1546905600000,
                    1546992000000,
                    1547078400000,
                    1547164800000,
                    1547251200000,
                    1547337600000,
                    1547424000000,
                    1547510400000,
                    1547596800000,
                    1547683200000,
                    1547769600000,
                    1547856000000,
                    1547942400000,
                    1548028800000,
                    1548115200000,
                    1548201600000,
                    1548288000000,
                    1548374400000,
                    1548460800000,
                    1548547200000,
                    1548633600000,
                    1548720000000,
                    1548806400000,
                    1548892800000,
                    1548979200000,
                    1549065600000,
                    1549152000000,
                    1549238400000,
                    1549324800000,
                    1549411200000,
                    1549497600000,
                    1549584000000,
                    1549670400000,
                    1549756800000,
                    1549843200000,
                    1549929600000,
                    1550016000000,
                    1550102400000,
                    1550188800000,
                    1550275200000,
                    1550361600000,
                    1550448000000,
                    1550534400000,
                    1550620800000,
                    1550707200000,
                    1550793600000,
                    1550880000000,
                    1550966400000,
                    1551052800000,
                    1551139200000,
                    1551225600000,
                    1551312000000,
                    1551398400000,
                    1551484800000,
                    1551571200000,
                    1551657600000,
                    1551744000000,
                    1551830400000,
                    1551916800000,
                    1552003200000,
                    1552089600000
                ],
                [
                    "y0",
                    2298660,
                    2253410,
                    2515820,
                    2506600,
                    2460240,
                    2408400,
                    2317430,
                    2240100,
                    2295900,
                    2609800,
                    2594200,
                    2626400,
                    2615000,
                    2617800,
                    2394500,
                    2391100,
                    2608300,
                    2676000,
                    2637700,
                    2766600,
                    3186500,
                    3067700,
                    2570700,
                    2935000,
                    2949200,
                    2913500,
                    2763600,
                    3216300,
                    2343500,
                    2361000,
                    2580000,
                    2591800,
                    2595200,
                    2569500,
                    2587700,
                    2372500,
                    2351200,
                    2465600,
                    2625100,
                    2651300,
                    2686700,
                    2783300,
                    2417400,
                    2383800,
                    2736300,
                    2751100,
                    2678900,
                    2622300,
                    2586000,
                    2365700,
                    2407700,
                    2541300,
                    2600400,
                    2581500,
                    2576200,
                    2550100,
                    2334500,
                    2139400,
                    2015400,
                    2019900,
                    2210100,
                    2191800,
                    2240700,
                    2107400,
                    2026900,
                    2258000,
                    2255200,
                    2123200,
                    2267800,
                    2236100,
                    2065700,
                    2093300,
                    2315300,
                    2333200,
                    2349800,
                    2318300,
                    2275000,
                    2110300,
                    2077100,
                    2335200,
                    2357400,
                    2350000,
                    2293800,
                    2303600,
                    2118700,
                    2100300,
                    2219700,
                    2361100,
                    2349500,
                    2347800,
                    2318400,
                    2141600,
                    2178600,
                    2432500,
                    2448700,
                    2440300,
                    2450100,
                    2424100,
                    2229900,
                    2152400,
                    2402600,
                    2401000,
                    2418100,
                    2408600,
                    2408400,
                    2212600,
                    2189000,
                    2450800,
                    2444500,
                    2451900,
                    2451000,
                    2442600,
                    2287900,
                    2221100,
                    2451900,
                    2460200,
                    2460900,
                    2319900,
                    2270300,
                    2183800,
                    2195300,
                    2485000,
                    2460900,
                    2500600,
                    2495300,
                    2479100,
                    2290600,
                    2235800,
                    2459900,
                    2484500,
                    2491000,
                    2525600,
                    2477300,
                    2223700,
                    2146700,
                    2528200,
                    2567800,
                    2556300,
                    2540700,
                    2503000,
                    2301200,
                    2251600,
                    2538600,
                    2596500,
                    2553900,
                    2534200,
                    2527300,
                    2337400,
                    2332900,
                    2688500,
                    2585700,
                    2559600,
                    2651600,
                    2586800,
                    2445700,
                    2472300,
                    2633000,
                    2664600,
                    2649400,
                    2648900,
                    2644600,
                    2406400,
                    2426200,
                    2694000,
                    2740600,
                    2711800,
                    2700900,
                    2645800,
                    2422800,
                    2438500,
                    2697500,
                    2712500,
                    2690300,
                    2684400,
                    2517300,
                    2435300,
                    2444300,
                    2781800,
                    2807800,
                    2804500,
                    2771300,
                    2798800,
                    2633300,
                    2597100,
                    2946300,
                    2889800,
                    2949600,
                    2951400,
                    2928800,
                    2701400,
                    2709900,
                    3012900,
                    3019100,
                    2977200,
                    3012400,
                    2989800,
                    2752100,
                    2749100,
                    3033300,
                    3050400,
                    3023800,
                    3066400,
                    3047800,
                    2792200,
                    2799300,
                    3096100,
                    3132500,
                    3082400,
                    3071200,
                    3021400,
                    2818300,
                    2737500,
                    3037800,
                    3123700,
                    3138900,
                    3181800,
                    3118500,
                    2834500,
                    2826900,
                    3171000,
                    3175900,
                    3184300,
                    3195800,
                    3129100,
                    2834100,
                    2876800,
                    3019000,
                    3214000,
                    3227900,
                    3189600,
                    3187800,
                    2886800,
                    2880500,
                    3218200,
                    3253700,
                    3260400,
                    3243300,
                    3204000,
                    2962700,
                    2968600,
                    3282100,
                    3618900,
                    3017000,
                    3037300,
                    3044500,
                    2758900,
                    2784600,
                    3032900,
                    3132400,
                    3075800,
                    3108200,
                    3076200,
                    2851800,
                    2837800,
                    3107500,
                    3146800,
                    3145100,
                    3145300,
                    3158400,
                    2872100,
                    2823800,
                    3190400,
                    3209300,
                    3170800,
                    3195300,
                    3183000,
                    2910300,
                    2937400,
                    3297100,
                    3293600,
                    3278400,
                    3234200,
                    3224000,
                    3013900,
                    2955300,
                    3303900,
                    3323300,
                    3352600,
                    3348400,
                    3340600,
                    3110600,
                    3066400,
                    3409200,
                    3462100,
                    3394200,
                    3383100,
                    3433700,
                    3184000,
                    3092700,
                    3417400,
                    4505200,
                    3094500,
                    3106100,
                    3083200,
                    3005600,
                    2866700,
                    2984100,
                    2954200,
                    3086800,
                    3070500,
                    3040900,
                    2903500,
                    3592500,
                    3316200,
                    2930500,
                    2961900,
                    3009600,
                    3027200,
                    2871600,
                    2831600,
                    2881700,
                    3054200,
                    3116600,
                    3120800,
                    3157300,
                    2950700,
                    2982700,
                    3192800,
                    3223300,
                    3219500,
                    3235900,
                    3214100,
                    3004400,
                    2963500,
                    3280400,
                    3262400,
                    3256000,
                    3258400,
                    3264900,
                    3107500,
                    3057400,
                    3326600,
                    3332400,
                    3357000,
                    3365100,
                    3359500,
                    3127400,
                    3130200,
                    3367100,
                    3422700,
                    3436400,
                    3431100,
                    3600000,
                    3146100,
                    3170900,
                    3467300,
                    3483400,
                    3473600,
                    3454700,
                    3390200,
                    3213600,
                    3188800,
                    3498200,
                    3498600,
                    3493500,
                    3478900,
                    3446400,
                    3239200,
                    3229100,
                    3559600,
                    3563600,
                    3549800,
                    3577300,
                    3524400,
                    3282500,
                    3271300,
                    3599200,
                    3575200,
                    3554400,
                    3540300,
                    3450600,
                    2812000
                ],
                [
                    "y1",
                    1130400,
                    1065370,
                    1211030,
                    1215590,
                    1206540,
                    1206720,
                    1085450,
                    1047320,
                    1071720,
                    1253170,
                    1261050,
                    1264660,
                    1260240,
                    1264840,
                    1130440,
                    1121660,
                    1294120,
                    1290780,
                    1284540,
                    1302860,
                    1296810,
                    1165450,
                    1128830,
                    1302070,
                    1304470,
                    1307090,
                    1268000,
                    1302160,
                    1159330,
                    1163530,
                    1327140,
                    1320680,
                    1319200,
                    1306810,
                    1287990,
                    1121240,
                    1145070,
                    1132400,
                    1310310,
                    1329340,
                    1340060,
                    1333530,
                    1167040,
                    1153260,
                    1356930,
                    1366500,
                    1375970,
                    1378570,
                    1357460,
                    1192240,
                    1188650,
                    1386450,
                    1400570,
                    1395730,
                    1404160,
                    1378120,
                    1195410,
                    1082000,
                    1189660,
                    1197540,
                    1367850,
                    1389070,
                    1386300,
                    1282240,
                    1209450,
                    1409070,
                    1409450,
                    1271120,
                    1424860,
                    1399990,
                    1240640,
                    1248530,
                    1451770,
                    1460240,
                    1466100,
                    1460990,
                    1446730,
                    1268830,
                    1263270,
                    1473530,
                    1476230,
                    1480760,
                    1460520,
                    1454730,
                    1263910,
                    1227240,
                    1303900,
                    1474760,
                    1473400,
                    1477380,
                    1466790,
                    1285620,
                    1280100,
                    1491820,
                    1499660,
                    1496260,
                    1485990,
                    1473140,
                    1301290,
                    1273440,
                    1487420,
                    1494560,
                    1500790,
                    1508660,
                    1489400,
                    1301960,
                    1297680,
                    1501170,
                    1503000,
                    1488980,
                    1501170,
                    1479060,
                    1367980,
                    1296050,
                    1493920,
                    1487830,
                    1479120,
                    1338410,
                    1318550,
                    1266620,
                    1285640,
                    1487970,
                    1489080,
                    1489580,
                    1475400,
                    1471140,
                    1316010,
                    1271940,
                    1476160,
                    1480670,
                    1491030,
                    1480940,
                    1477640,
                    1305750,
                    1296770,
                    1483400,
                    1494440,
                    1495740,
                    1485900,
                    1484400,
                    1319160,
                    1284010,
                    1488140,
                    1502910,
                    1503450,
                    1485410,
                    1498200,
                    1323200,
                    1303150,
                    1506840,
                    1523440,
                    1521490,
                    1516770,
                    1504300,
                    1327520,
                    1307630,
                    1518100,
                    1521370,
                    1521280,
                    1521660,
                    1517700,
                    1349880,
                    1333010,
                    1543800,
                    1553730,
                    1546490,
                    1541710,
                    1532690,
                    1367020,
                    1354040,
                    1560080,
                    1564990,
                    1565050,
                    1561110,
                    1406570,
                    1340850,
                    1368550,
                    1600180,
                    1630760,
                    1621360,
                    1636580,
                    1652580,
                    1489550,
                    1465750,
                    1731080,
                    1730190,
                    1732260,
                    1730210,
                    1724800,
                    1519480,
                    1520490,
                    1758280,
                    1774530,
                    1770690,
                    1781100,
                    1762270,
                    1551690,
                    1541620,
                    1787290,
                    1795490,
                    1802940,
                    1799130,
                    1778850,
                    1560040,
                    1564580,
                    1822410,
                    1819680,
                    1812390,
                    1814100,
                    1798060,
                    1587880,
                    1589320,
                    1833920,
                    1843420,
                    1851460,
                    1845550,
                    1822980,
                    1596860,
                    1595900,
                    1866000,
                    1860480,
                    1862600,
                    1863950,
                    1827540,
                    1585280,
                    1588970,
                    1683930,
                    1879500,
                    1883300,
                    1879040,
                    1846160,
                    1639090,
                    1632580,
                    1895780,
                    1897620,
                    1906000,
                    1906730,
                    1895290,
                    1670120,
                    1670190,
                    1914360,
                    1932890,
                    1933160,
                    1921800,
                    1898720,
                    1673530,
                    1685190,
                    1937730,
                    1951850,
                    1949900,
                    1949020,
                    1923160,
                    1718450,
                    1704040,
                    1964800,
                    1975140,
                    2002510,
                    1985340,
                    1959000,
                    1736810,
                    1727670,
                    2006070,
                    2013910,
                    2012460,
                    1999630,
                    1977020,
                    1754720,
                    1778560,
                    2060360,
                    2057730,
                    2055990,
                    2036720,
                    2027870,
                    1824680,
                    1794140,
                    2067460,
                    2078290,
                    2094100,
                    2080950,
                    2062080,
                    1836850,
                    1828130,
                    2102920,
                    2112450,
                    2098790,
                    2116900,
                    2080290,
                    1863760,
                    1841050,
                    2105790,
                    2106420,
                    2151300,
                    2098890,
                    2085380,
                    1955580,
                    1819790,
                    1916140,
                    1913670,
                    2080350,
                    2058160,
                    2034960,
                    1911480,
                    1823940,
                    2087990,
                    1774260,
                    1833950,
                    1906680,
                    1902490,
                    1760460,
                    1748060,
                    1775740,
                    1974730,
                    2013790,
                    2026250,
                    2022210,
                    1835820,
                    1835930,
                    2096230,
                    2098020,
                    2095770,
                    2114060,
                    2099370,
                    1902800,
                    1854380,
                    2132520,
                    2143600,
                    2146120,
                    2143820,
                    2157910,
                    1929390,
                    1905550,
                    2183760,
                    2185970,
                    2198030,
                    2198160,
                    2182120,
                    1950150,
                    1931800,
                    2215380,
                    2216240,
                    2226480,
                    2220480,
                    2208790,
                    1972190,
                    1957520,
                    2253470,
                    2247170,
                    2245720,
                    2285890,
                    2220730,
                    1986340,
                    1967720,
                    2264340,
                    2270140,
                    2267210,
                    2268950,
                    2246450,
                    2048760,
                    1994100,
                    2288680,
                    2296010,
                    2313730,
                    2311290,
                    2293790,
                    2034250,
                    2025380,
                    2326190,
                    2323990,
                    2320790,
                    2271600,
                    2244270,
                    1663290
                ],
                [
                    "y2",
                    820900,
                    766050,
                    894390,
                    894540,
                    887590,
                    814490,
                    786610,
                    744660,
                    770920,
                    930330,
                    930190,
                    942060,
                    933690,
                    922280,
                    810770,
                    809760,
                    952010,
                    959070,
                    957020,
                    955890,
                    948250,
                    825710,
                    804970,
                    958480,
                    959090,
                    970200,
                    907010,
                    950150,
                    825240,
                    820890,
                    971020,
                    973560,
                    967940,
                    960360,
                    931820,
                    795020,
                    753860,
                    808740,
                    970000,
                    981020,
                    979810,
                    975840,
                    829690,
                    819300,
                    992290,
                    998040,
                    1006540,
                    1013790,
                    995130,
                    848190,
                    851890,
                    1024210,
                    1032210,
                    1032290,
                    1027510,
                    1010090,
                    850110,
                    741740,
                    844400,
                    850410,
                    1006690,
                    1018470,
                    1011630,
                    916990,
                    861050,
                    1039650,
                    1032640,
                    904200,
                    1045560,
                    1022330,
                    888970,
                    896300,
                    1073460,
                    1074860,
                    1074820,
                    1074880,
                    1057340,
                    909410,
                    906710,
                    1078860,
                    1092760,
                    1083360,
                    1078680,
                    1067310,
                    903090,
                    858360,
                    947540,
                    1089590,
                    1095060,
                    1093130,
                    1070660,
                    915380,
                    916530,
                    1108410,
                    1109460,
                    1097230,
                    1094520,
                    1074630,
                    915520,
                    915750,
                    1101730,
                    1104580,
                    1107930,
                    1116850,
                    1106360,
                    928500,
                    928210,
                    1110530,
                    1103230,
                    1099970,
                    1106180,
                    1096060,
                    982050,
                    932620,
                    1100880,
                    1099970,
                    1080040,
                    959480,
                    951360,
                    902160,
                    916070,
                    1094120,
                    1092530,
                    1089290,
                    1081760,
                    1073320,
                    937320,
                    900010,
                    1084910,
                    1082620,
                    1080960,
                    1074050,
                    1077810,
                    925090,
                    913970,
                    1082900,
                    1089240,
                    1088890,
                    1088720,
                    1084170,
                    938750,
                    904060,
                    1091540,
                    1093660,
                    1104520,
                    1085860,
                    1091880,
                    939720,
                    919790,
                    1098590,
                    1110310,
                    1105580,
                    1105220,
                    1096580,
                    940670,
                    923480,
                    1102360,
                    1102760,
                    1102280,
                    1108680,
                    1109210,
                    955490,
                    944730,
                    1125380,
                    1127440,
                    1123070,
                    1123910,
                    1121160,
                    966340,
                    946940,
                    1141980,
                    1146790,
                    1147420,
                    1132920,
                    990870,
                    946370,
                    964610,
                    1171550,
                    1187000,
                    1186370,
                    1199100,
                    1213000,
                    1062280,
                    1035740,
                    1274070,
                    1276740,
                    1280670,
                    1282770,
                    1257200,
                    1085370,
                    1080510,
                    1293120,
                    1308880,
                    1302170,
                    1317570,
                    1298110,
                    1111780,
                    1106410,
                    1317620,
                    1318010,
                    1332680,
                    1328530,
                    1305330,
                    1113540,
                    1119830,
                    1340410,
                    1348770,
                    1346910,
                    1352950,
                    1324040,
                    1139450,
                    1136680,
                    1355970,
                    1364950,
                    1377510,
                    1375770,
                    1338490,
                    1140310,
                    1151830,
                    1374520,
                    1374330,
                    1378990,
                    1372390,
                    1347390,
                    1135560,
                    1121640,
                    1217410,
                    1390340,
                    1392710,
                    1383070,
                    1372400,
                    1170430,
                    1169550,
                    1404540,
                    1412720,
                    1414110,
                    1417200,
                    1388240,
                    1194260,
                    1188850,
                    1416140,
                    1425890,
                    1426380,
                    1410520,
                    1388600,
                    1197940,
                    1197680,
                    1432620,
                    1448350,
                    1436320,
                    1438890,
                    1412650,
                    1222040,
                    1215220,
                    1454190,
                    1456740,
                    1490670,
                    1470910,
                    1438940,
                    1243620,
                    1241210,
                    1483460,
                    1489950,
                    1488440,
                    1482490,
                    1465050,
                    1261450,
                    1281800,
                    1552680,
                    1527050,
                    1526500,
                    1511360,
                    1497560,
                    1302860,
                    1292930,
                    1547830,
                    1550610,
                    1546490,
                    1547790,
                    1525750,
                    1324580,
                    1321580,
                    1576620,
                    1575060,
                    1570240,
                    1574670,
                    1543830,
                    1341780,
                    1341710,
                    1577840,
                    1565630,
                    1580460,
                    1569570,
                    1543390,
                    1431880,
                    1301600,
                    1401500,
                    1401040,
                    1530910,
                    1526670,
                    1498750,
                    1383070,
                    1284000,
                    1401510,
                    1189880,
                    1309810,
                    1380230,
                    1383630,
                    1254140,
                    1216830,
                    1243860,
                    1442240,
                    1481680,
                    1480680,
                    1490700,
                    1315410,
                    1300930,
                    1530520,
                    1532340,
                    1539150,
                    1541510,
                    1532770,
                    1344910,
                    1325530,
                    1563330,
                    1568490,
                    1580110,
                    1575130,
                    1564880,
                    1369810,
                    1359060,
                    1608230,
                    1605640,
                    1605970,
                    1601640,
                    1590810,
                    1381740,
                    1375190,
                    1625850,
                    1621800,
                    1629910,
                    1628510,
                    1609760,
                    1397880,
                    1392180,
                    1647700,
                    1646770,
                    1644200,
                    1667150,
                    1610910,
                    1408450,
                    1395010,
                    1652870,
                    1658870,
                    1660310,
                    1659060,
                    1629490,
                    1435450,
                    1407720,
                    1675610,
                    1682450,
                    1682070,
                    1693010,
                    1669030,
                    1448500,
                    1439490,
                    1710110,
                    1702690,
                    1707000,
                    1662770,
                    1512800,
                    1101660
                ],
                [
                    "y3",
                    409540,
                    377260,
                    456380,
                    460230,
                    452020,
                    389350,
                    397230,
                    369000,
                    382180,
                    473570,
                    477470,
                    477550,
                    478030,
                    466150,
                    397480,
                    406380,
                    494570,
                    494680,
                    482810,
                    487700,
                    475090,
                    400520,
                    397940,
                    484160,
                    487740,
                    493260,
                    434500,
                    475410,
                    398650,
                    404690,
                    491980,
                    493410,
                    485250,
                    484740,
                    465490,
                    377460,
                    353960,
                    396390,
                    493300,
                    497560,
                    495110,
                    485260,
                    394770,
                    402910,
                    500540,
                    506260,
                    509680,
                    514010,
                    494350,
                    405360,
                    412560,
                    513030,
                    521320,
                    515730,
                    518170,
                    499850,
                    394960,
                    328510,
                    406450,
                    408080,
                    501980,
                    507800,
                    496990,
                    442530,
                    414260,
                    525770,
                    513440,
                    442660,
                    526810,
                    500190,
                    426220,
                    436110,
                    546820,
                    543480,
                    545420,
                    540530,
                    527770,
                    431050,
                    443100,
                    549550,
                    551600,
                    548120,
                    542290,
                    528810,
                    435370,
                    407250,
                    463200,
                    553640,
                    554110,
                    555820,
                    536470,
                    440460,
                    447740,
                    563330,
                    561850,
                    556430,
                    550910,
                    539440,
                    441200,
                    442310,
                    563100,
                    563760,
                    559230,
                    570870,
                    555280,
                    447750,
                    455570,
                    564630,
                    562510,
                    556050,
                    555560,
                    556470,
                    484080,
                    451320,
                    561060,
                    553630,
                    540660,
                    473500,
                    472500,
                    438550,
                    447590,
                    548670,
                    549580,
                    539920,
                    541510,
                    540380,
                    450260,
                    432260,
                    535950,
                    545160,
                    543810,
                    536990,
                    539680,
                    446570,
                    444470,
                    543450,
                    549070,
                    547840,
                    541430,
                    540200,
                    450080,
                    431800,
                    549290,
                    545890,
                    556300,
                    536500,
                    543890,
                    450890,
                    440180,
                    550850,
                    554740,
                    553460,
                    553440,
                    546420,
                    446710,
                    436640,
                    553270,
                    547750,
                    551920,
                    547610,
                    545500,
                    449220,
                    447510,
                    560050,
                    561560,
                    561560,
                    556630,
                    559340,
                    461630,
                    456300,
                    569070,
                    574800,
                    575220,
                    566180,
                    472200,
                    450530,
                    462960,
                    590290,
                    597250,
                    592970,
                    604870,
                    613050,
                    512200,
                    495980,
                    649860,
                    645070,
                    636950,
                    647120,
                    630390,
                    518820,
                    525990,
                    661700,
                    659770,
                    660650,
                    669560,
                    644510,
                    529610,
                    539520,
                    673850,
                    668530,
                    673770,
                    669480,
                    654540,
                    536090,
                    548400,
                    690100,
                    684900,
                    687040,
                    685940,
                    666360,
                    560140,
                    553050,
                    696740,
                    694490,
                    703000,
                    697980,
                    674460,
                    548230,
                    557370,
                    697150,
                    700110,
                    701170,
                    695810,
                    669780,
                    543500,
                    540170,
                    597430,
                    711500,
                    699770,
                    698520,
                    682170,
                    568380,
                    572950,
                    715580,
                    716050,
                    720770,
                    720660,
                    695220,
                    572970,
                    578170,
                    722280,
                    724280,
                    727910,
                    719820,
                    699840,
                    580870,
                    586270,
                    729850,
                    733680,
                    726590,
                    731270,
                    709330,
                    593070,
                    600500,
                    743590,
                    743690,
                    767660,
                    747140,
                    730510,
                    607540,
                    610480,
                    762440,
                    772960,
                    763480,
                    758490,
                    741090,
                    614450,
                    645760,
                    831130,
                    792100,
                    780410,
                    778620,
                    761000,
                    643620,
                    650320,
                    802640,
                    805900,
                    803960,
                    800580,
                    783660,
                    648310,
                    668150,
                    825940,
                    818650,
                    816630,
                    821000,
                    782790,
                    657850,
                    671660,
                    817660,
                    816020,
                    821380,
                    816280,
                    800240,
                    712510,
                    648060,
                    711170,
                    709110,
                    802240,
                    792710,
                    772260,
                    691490,
                    636050,
                    649450,
                    566120,
                    651310,
                    701910,
                    702270,
                    627880,
                    605290,
                    621710,
                    744830,
                    762830,
                    765640,
                    764140,
                    648720,
                    642430,
                    786580,
                    778790,
                    780060,
                    789170,
                    772600,
                    652160,
                    648950,
                    795360,
                    802250,
                    808010,
                    801890,
                    793490,
                    669240,
                    665310,
                    814370,
                    810880,
                    814580,
                    813950,
                    802070,
                    670450,
                    674250,
                    823010,
                    820620,
                    821400,
                    820760,
                    804300,
                    681870,
                    681460,
                    831580,
                    835600,
                    835390,
                    840770,
                    810700,
                    675170,
                    680870,
                    832000,
                    836790,
                    845630,
                    844560,
                    821810,
                    690310,
                    683810,
                    851150,
                    848090,
                    846480,
                    858340,
                    831290,
                    696470,
                    695540,
                    866980,
                    868190,
                    861720,
                    834530,
                    706650,
                    439140
                ]
            ],
            "types": {
                "y0": "line",
                "y1": "line",
                "y2": "line",
                "y3": "line",
                "x": "x"
            },
            "names": {
                "y0": "#0",
                "y1": "#1",
                "y2": "#2",
                "y3": "#3"
            },
            "colors": {
                "y0": "#cb513a",
                "y1": "#73c03a",
                "y2": "#65b9ac",
                "y3": "#4682b4"
            }
        }
    ]
    ;

    const factory = new ChartFactory(Panel, Canvas, Scrollbar, Checkboxes);

    document.addEventListener('DOMContentLoaded', function () {

        const parent = document.getElementById('root');

        for (let datum of data) {
            factory.create(datum, parent);
        }
    });

}());
