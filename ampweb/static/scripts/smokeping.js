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
var current_series = 0;
Flotr.addType('smoke', {
    options: {
        show: false,     // => setting to true will show smoke
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

    /* in a single-series graph colour each line based on the loss */
    get_loss_style : function (loss) {
        /*
         * Colours are based on the smokeping loss colours, though the
         * ranges that they cover are slightly different. Any loss above
         * 50% (10 of the 20 packets for smokeping) gets red.
         */
        if ( loss == 0 ) {
            return "rgba(0, 255, 0, 1.0)";
        } else if ( loss <= 5 ) {
            return "rgba(0, 184, 255, 1.0)";
        } else if ( loss <= 10 ) {
            return "rgba(0, 89, 255, 1.0)";
        } else if ( loss <= 15 ) {
            return "rgba(94, 0, 255, 1.0)";
        } else if ( loss <= 25 ) {
            return "rgba(126, 0, 255, 1.0)";
        } else if ( loss <= 50 ) {
            return "rgba(221, 0, 255, 1.0)";
        }
        return "rgba(255, 0, 0, 1.0)";
    },

    /* fill is black for single series, otherwise based on series colour */
    get_fill_style : function (total) {
        if ( total == 1 ) {
            return "rgba(0, 0, 0, 0.2)";
        }
        return getSeriesSmokeStyle(current_series);
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
            legend    = options.legenddata,
            length    = data.length - 1,
            prevx     = null,
            prevy     = null,
            x1, x2, y1, y2, i, median, ping, measurements, loss, count;
        var horizontalStrokeStyle, verticalStrokeStyle, fillStyle, hue;

        if ( length < 1 ) {
            return;
        }

        /* look at the legend to see how many lines we have */
        count = getSeriesLineCount(legend);

        context.beginPath();

        fillStyle = this.get_fill_style(count);
        /* use the appropriate colour for the line based on series count */
        if ( count == 1 ) {
            verticalStrokeStyle = "rgba(0, 0, 0, 1.0)";
        } else {
            horizontalStrokeStyle = getSeriesStyle(current_series);
            verticalStrokeStyle = horizontalStrokeStyle;
        }

        console.log(verticalStrokeStyle);
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


            context.beginPath();
            context.lineWidth = medianLineWidth;
            if ( count == 1 ) {
                horizontalStrokeStyle = this.get_loss_style(loss);
            }
            context.strokeStyle = horizontalStrokeStyle;


            /* draw horizontal line for the median measurement */
            context.moveTo(x1, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, y1+shadowOffset);
            context.stroke();

            /* draw vertical line between measurements */
            context.beginPath();
            /* if a single series smokeping graph, use a thin black line,
             * otherwise continue to use the series colour
             */
            context.strokeStyle = verticalStrokeStyle;
            context.lineWidth = verticalLineWidth;
            context.moveTo(prevx + shadowOffset / 2, y1+shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, prevy);
            context.stroke();
        }
        current_series = (current_series + 1) % count;
    },

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
