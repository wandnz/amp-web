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

        if ( length < 1 ) {
            return;
        }

        context.beginPath();

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
            context.fillStyle = 'rgba(0,0,0,0.2)';
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


            /* use the loss data to colour the line */
            context.beginPath();
            context.lineWidth = medianLineWidth;

            /*
             * Colours are based on the smokeping loss colours, though the
             * ranges that they cover are slightly different. Any loss above
             * 50% (10 of the 20 packets for smokeping) gets red.
             */
            if ( loss == 0 ) {
                context.strokeStyle = 'rgba(0, 255, 0, 1.0)';
            } else if ( loss <= 5 ) {
                context.strokeStyle = 'rgba(0, 184, 255, 1.0)';
            } else if ( loss <= 10 ) {
                context.strokeStyle = 'rgba(0, 89, 255, 1.0)';
            } else if ( loss <= 15 ) {
                context.strokeStyle = 'rgba(94, 0, 255, 1.0)';
            } else if ( loss <= 25 ) {
                context.strokeStyle = 'rgba(126, 0, 255, 1.0)';
            } else if ( loss <= 50 ) {
                context.strokeStyle = 'rgba(221, 0, 255, 1.0)';
            } else {
                context.strokeStyle = 'rgba(255, 0, 0, 1.0)';
            }

            /* draw horizontal line for the median measurement */
            context.moveTo(x1, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, y1+shadowOffset);
            context.stroke();


            /* draw thin black vertical line between measurements */
            context.beginPath();
            context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
            context.lineWidth = verticalLineWidth;
            context.moveTo(prevx + shadowOffset / 2, y1+shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, prevy);
            context.stroke();
        }
    },

    /**
     *
     */
    extendYRange : function (axis, data, options, lines) {

        var o = axis.options;
        var i;

        /*
         * Check if we need to extend the y range to accommodate smoke.
         * TODO: ideally this can be worked out at graph creation? It already
         * has the data at the point it decides the y-max but it seems that
         * the flotr series library only looks at data[i][0] and data[i][1].
         */
        /* TODO is this operating on the right data? sometimes goes too high */
        for ( i = 0; i < data.length; i++ ) {
            var j;
            /* measurements may be [timestamp,median,loss,ping1, ping2 ...] */
            for ( j = 3; j < data[i].length; j++ ) {
                if ( data[i][j] > axis.max ) {
                    axis.max = data[i][j];
                }
            }
        }
        /*
         * Update the tick size to reflect the new range so that the grid will
         * be drawn appropriately when it gets refreshed.
         */
        axis.tickSize = Flotr.getTickSize(axis.options.noTicks, axis.min,
                  axis.max, axis.options.tickDecimals);
    },
});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
