/* Standard line graph
 *
 * Unfortunately, we need to define our own Flotr plugin so that we can
 * utilise our own colour allocation scheme. 
 *
 * It might be possible to do this without a separate plugin, but our colour
 * allocation scheme is hsla and the standard colour config in flotr is
 * rgb so we'd have to do a lot of conversions to get everything to match up.
 * Maybe someone who is better at flotr / javascript than me could do better.
 *
 */

Flotr.addType('basicts', {
    options: {
        lineWidth: 2
    },
     
    draw : function (options) {
        var context = options.context;
        context.save();
        context.lineJoin = 'round';
        this.plot(options, 0, true, false);
        context.restore();
    },

    hit : function(options) {
        var args = options.args,
            mouse = args[0],
            n = args[1]
            colourid = options.data.colourid,
            data = options.data.series;

        if ( colourid === undefined )
            return;
        
        /* This function is in util.js */
        var hitcheck = isMouseHitOnSeries(data, mouse, options); 
        if (hitcheck.isHit) {
            n.x = hitcheck.x;
            n.y = hitcheck.y;
            n.index = colourid;
            n.seriesIndex = 0;
            n.event = false;
            n.data = data;
        }
    },

    drawHit: function (options) {
        if (options.args.event)
            return;
        this.plot(options, 0, true, true);
    },

    clearHit: function (options) {
        if (options.args.event)
            return;
        options.context.clearRect(0, 0, options.width, options.height);
    }, 

    plot : function(options, shadowOffset, incStack, hover) {
        var
            context   = options.context,
            width     = options.width,
            height    = options.height,
            xScale    = options.xScale,
            yScale    = options.yScale,
            data      = hover ? options.args.data : options.data.series,
            lineWidth = hover ? options.lineWidth + 1 : options.lineWidth,
            legend    = options.legenddata,
            colourid  = hover ? options.args.index : options.data.colourid,
            prevx     = null,
            prevy     = null,
            x1, x2, y1, y2, i, count, length;
       
        var lineColour;

        if (colourid == undefined)
            return;

        /*
        if ( hover ) {
            context.shadowColor = "rgba(0, 0, 0, 0.3)";
            context.shadowOffsetY = 1;
            context.shadowOffsetX = 0;
            context.shadowBlur = 2;
        }
        */

        count = getSeriesLineCount(legend);
        context.beginPath();
        lineColour = getSeriesStyle(colourid);
        length    = data.length - 1;

        for (i = 0; i < length; ++i) {
            /* Basic TS should all be [timestamp, value] */
            if (data[i].length < 2)
                continue;

            /* Allow empty values */
            if ( data[i][1] === null || data[i+1][1] === null ) 
                continue;

            x1 = xScale(data[i][0]);
            x2 = xScale(data[i+1][0]);
        
            y1 = yScale(data[i][1])
            y2 = yScale(data[i+1][1])

            if (y1 > height || y1 < 0 || (x1 < 0 && x2 < 0) || 
                    (x1 > width && x2 > width))
                continue;

            if (prevx != x1 || prevy != y1 + shadowOffset)
                context.moveTo(x1, y1 + shadowOffset);
            
            prevx = x2;
            prevy = y2 + shadowOffset;


            context.beginPath();
            context.lineWidth = lineWidth;
            context.strokeStyle = lineColour;

            context.moveTo(x1, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, y1 + shadowOffset);
            context.stroke();

            context.beginPath();
            context.lineWidth = lineWidth;
            context.strokeStyle = lineColour;
            context.moveTo(prevx + shadowOffset / 2, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, prevy);
            context.stroke();
        }

    }
});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

