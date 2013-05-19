/** Timeseries graph for visualising byte counts for interfaces **/
Flotr.addType('muninbytes', {
    options: {
        show: false,      // => setting to true will show lines, false will hide
        lineWidth: 2,     // => line width in pixels
        fill: false,      // => true to fill the area under the line
        fillBorder: false,// => draw a border around the fill
        fillColor: null,  // => fill color
        fillOpacity: 0.4  // => opacity of the fill color, 1 for a solid fill
    },


    /**
     * Draws lines series in the canvas element.
     * @param {Object} options
     */
    draw : function (options) {

        var context = options.context;
        var lineWidth = options.lineWidth;
        var shadowSize = options.shadowSize;
        var offset;

        context.save();
        context.lineCap = 'butt';
        context.lineWidth = lineWidth;
        context.strokeStyle = options.color;

        this.plot(options);

        context.restore();
    },


    /**
     * Just try and draw a single time series, at least for a start
     *
     * TODO
     * Ultimately, I think we want to move towards showing bytes in and bytes
     * out on the same graph but let's keep it simple for now 
     */
    plot : function (options) {

        var context = options.context;
        var xScale = options.xScale;
        var yScale = options.yScale;
        var data = options.data;
        var length = data.length - 1;
        var zero = yScale(0);
        var x0;
        var y0;

        if (length < 1) {
            return;
        }

        /*
         * data looks like:
         *
         *
         */
        x0 = xScale(data[0][0]);
        y0 = yScale(data[0][1]);

        context.beginPath();
        context.moveTo(x0, y0);

        for (i = 0; i < length; ++i) {
            context.lineTo(
                    xScale(data[i+1][0]),
                    yScale(data[i+1][1])
                    );
        }

        if (!options.fill || options.fill && !options.fillBorder) {
            context.stroke();
        }

        if (options.fill){
            x0 = xScale(data[0][0]);
            context.fillStyle = options.fillStyle;
            context.lineTo(xScale(data[length][0]), zero);
            context.lineTo(x0, zero);
            context.lineTo(x0, yScale(data[0][1]));
            context.fill();
            if (options.fillBorder) {
                context.stroke();
            }
        }
    },


    /**
     *
     */
    extendYRange : function (axis, data, options, lines) {

        var o = axis.options;

        // HACK
        if ((!o.max && o.max !== 0) || (!o.min && o.min !== 0)) {
            axis.max += options.lineWidth * 0.01;
            axis.min -= options.lineWidth * 0.01;
            /*
               axis.max = axis.p2d((axis.d2p(axis.max) + options.lineWidth));
               axis.min = axis.p2d((axis.d2p(axis.max) - options.lineWidth));
             */
        }
    }
});
