/*
 * Smokeping style line graph
 *
 * Plot a smokeping style line graph based on the built-in "lines" flotr2
 * type, and smokeping by Tobi Oetiker. Behaviour is based mostly on the
 * smokeping guide found at:
 *
 *      http://oss.oetiker.ch/smokeping/doc/reading.en.html
 *
 * Briefly:
 * - Draw a line segment at the median value for a block of measurements.
 * - Colour the line based on the amount of loss in that block.
 * - Draw a heatmap around the median, representing the other measurements
 *   in that block and their distribution around the median.
 *
 * TODO: extend loss colours regions to the top and bottom of graph?
 * TODO: adjust smoke opacity based on number of measurements so if there
 *	 are only a small number of tests made the smoke is still visible
 * TODO: adjust line colours based on number of measurements, so if there
 *	 are only a small number of tests made the colour is still relevant
 */
var count = 0;
Flotr.addType('smoke', {
    options: {
        show: false,     // => setting to true will show lines
        medianLineWidth: 3,
        verticalLineWidth: 1,
    },

    /**
     * Draws lines series in the canvas element.
     * @param {Object} options
     */
    draw : function (options) {

        var context = options.context;

        context.save();
        context.lineJoin = 'round';

        this.plot(options, 0, true);

        context.restore();
    },

    /**
     *
     */
    plot : function (options, shadowOffset, incStack) {

        var
            context   = options.context,
            width     = options.width,
            height    = options.height,
            xScale    = options.xScale,
            yScale    = options.yScale,
            data      = options.data,
            medianLineWidth = options.medianLineWidth,
            verticalLineWidth = options.verticalLineWidth,
            length    = data.length - 1,
            prevx     = null,
            prevy     = null,
            x1, x2, y1, y2, i, median, ping, measurements, loss;
        var strokeStyle, fillStyle, hue;

        if ( length < 1 ) {
            return;
        }

        context.beginPath();

        /* http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/ */
        /*
         * 0.618033988749895 is the golden ratio conjugate that was used when
         * hue was in the range 0-1, I've multiplied it by 360 to fit the range
         * 0-360, is this sensible? What about a Sobol or Halton sequence?
         */
        hue = (count * 222.49223594996221) % 360;
        strokeStyle = "hsla(" + hue + ", 90%, 50%, 1.0)";
        fillStyle = "hsla(" + hue + ", 90%, 50%, 0.1)";

        for ( i = 0; i < length; ++i ) {
            /* To allow empty values */
            if ( data[i][1] === null || data[i+1][1] === null ) {
                continue;
            }

            /* data should have at least [timestamp,median,loss] */
            if ( data[i].length < 3 ) {
                continue;
            }

            x1 = xScale(data[i][0]);
            x2 = xScale(data[i+1][0]);

            measurements = data[i].length,
            loss = data[i][2];
            median = data[i][1];
            y1 = yScale(median);
            y2 = yScale(data[i+1][1]);

            if (
                (y1 > height && y2 > height) ||
                (y1 < 0 && y2 < 0) ||
                (x1 < 0 && x2 < 0) ||
                (x1 > width && x2 > width)
               ) continue;

            if ( (prevx != x1) || (prevy != y1 + shadowOffset) ) {
                context.moveTo(x1, y1 + shadowOffset);
            }

            prevx = x2;
            prevy = y2 + shadowOffset;


            /*
             * Draw smoke around the median if the data is available. If we
             * draw this first then all the coloured lines get drawn on top,
             * without being obscured.
             */
            context.fillStyle = fillStyle;
            /* TODO is this going to be really slow? */
            for ( j = 3; j < measurements; j++ ) {
                ping = data[i][j];
                if ( ping == null ) {
                    continue;
                }
                /* draw a rectangle for every non-median measurement */
                if ( ping != median ) {
                    context.fillRect(x1, y1, x2-x1,
                        yScale(ping) - yScale(median));
                }
            }


            /* use the series colour for the line */
            context.beginPath();
            context.lineWidth = medianLineWidth;
            context.strokeStyle = strokeStyle;

            /* draw horizontal line for the median measurement */
            context.moveTo(x1, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, y1+shadowOffset);
            context.stroke();

            /* draw vertical line between measurements */
            context.beginPath();
            context.strokeStyle = strokeStyle;
            context.lineWidth = verticalLineWidth;
            context.moveTo(prevx + shadowOffset / 2, y1+shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, prevy);
            context.stroke();
        }
        count = (count + 1) % options.count;
    },

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
