(function () {

var DRAW_ALL     = 0,
    DRAW_LINES   = 1,
    DRAW_MARKERS = 2;

Flotr.addPlugin('eventsOverlay', {

    options: {

    },

    savedCanvas: null,

    callbacks: {
        'flotr:beforedraw': function() {
            if ( this.options.events.drawBehind )
                this.eventsOverlay.drawEvents(DRAW_LINES);
        },
        'flotr:afterdraw' : function () {
            if ( this.options.events.drawBehind )
                this.eventsOverlay.drawEvents(DRAW_MARKERS);
            else
                this.eventsOverlay.drawEvents(DRAW_ALL);
        },
        'flotr:eventhit' : function(options) {
            this.eventsOverlay.eventHit(options);
        },
        'flotr:eventdrawhit' : function(options) {
            this.eventsOverlay.eventDrawHit(options);
        },
        'flotr:eventclearhit' : function(options) {
            this.eventsOverlay.eventClearHit(options);
        }
    },

    xScale: function(point) {
        var len = this.axes.x.max - this.axes.x.min,
            subset = point - this.axes.x.min,
            pixel = (subset / len) * this.axes.x.length;
        pixel += this.plotOffset.left;
        return pixel;
    },

    xInverse: function(pixel) {
        var len = this.axes.x.max - this.axes.x.min,
            subset = this.axes.x.length - pixel,
            point = subset * len + this.axes.x.min;
        return point;
    },

    /**
     * Select a colour based on event severity. This is mostly just
     * to show that we can do it, probably needs some more thought put
     * into what colours to use and what sort of scale.
     */
    getHue: function(severity) {
        if ( severity < 0 ) {
            return 240; // hover state
        } else if ( severity < 30 ) {
            return 47;
        } else if ( severity < 60 ) {
            return 30;
        }
        return 0;
    },

    getStrokeColour: function(severity) {
        return "hsla(" + this.eventsOverlay.getHue(severity) + ", 100%, 50%, 1.0)";
    },

    getFillColour: function(severity) {
        return "hsla(" + this.eventsOverlay.getHue(severity) + ", 100%, 70%, 1.0)";
    },

    /**
     * Draw a vertical line to mark an event, annotating it if appropriate
     * to show how many events it represents (if merged/aggregated).
     */
    plotEvent: function(ts, severity, count, hover, drawType) {
        var e = this.eventsOverlay,
            ctx = this.ctx,
            xScale = e.xScale,
            options = this.options,
            plotOffset = this.plotOffset,
            plotWidth = this.plotWidth,
            plotHeight = this.plotHeight,
            x = xScale(ts),
            lineWidth = options.events.lineWidth,
            fontSize = options.fontSize;

        if ( x < plotOffset.left ||
                x > plotOffset.left + plotWidth )
            return;

        ctx.save();

        if (this.plotHeight < 150)
            lineWidth = lineWidth / 2;

        ctx.lineWidth = hover ? lineWidth * 2 : lineWidth;
        ctx.strokeStyle = e.getStrokeColour(severity);

        if (drawType == DRAW_ALL || drawType == DRAW_LINES) {
            ctx.beginPath();
            ctx.moveTo(x, plotHeight + plotOffset.top);
            ctx.lineTo(x, plotOffset.top);
            ctx.closePath();
            ctx.stroke();
        }

        if (drawType == DRAW_ALL || drawType == DRAW_MARKERS) {
            var radius = this.plotHeight < 150 ? plotOffset.top / 3 : plotOffset.top / 2;

            ctx.beginPath();
            ctx.moveTo(x, plotOffset.top);
            ctx.lineTo(x, radius);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.fillStyle = e.getFillColour(severity);
            ctx.moveTo(x, lineWidth);
            ctx.lineTo(x + radius, radius + lineWidth);
            ctx.lineTo(x, radius * 2 + lineWidth);
            ctx.lineTo(x - radius, radius + lineWidth);
            ctx.lineTo(x, lineWidth);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();

        if ( count > 1 ) {
            /*
            * If there is more than one event at this time then mark it
            * with the event count
            */
            var y = radius + 2;

            ctx.save();
            ctx.translate(x, y);
            ctx.font = "" + fontSize * 1.3 + "px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = hover ? "#000" : "#fff";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = hover ? "#fff" : "#000";
            ctx.fillText(count, 0, 0);
            ctx.restore();
        }
    },

    drawEvents: function(drawType) {
        var e = this.eventsOverlay,
            hits = this.options.events.hits;

        for ( var hit in hits ) {
            if ( hits.hasOwnProperty(hit) ) {
                var max_severity = 0;
                for ( var i = 0; i < hits[hit].length; i++ ) {
                    if ( hits[hit][i].severity > max_severity )
                        max_severity = hits[hit][i].severity;
                }
                e.plotEvent(hit, max_severity, hits[hit].length, false, drawType);
            }
        }
    },

    eventHit: function(options) {
        var hits = this.options.events.hits,
            events = options.events,
            args = options.args,
            xScale = options.xScale,
            mouse = args[0],
            n = args[1];

        n.event = false;

        if ( events == undefined || events.length < 1 ) {
            return;
        }

        for ( var ts in hits ) {
            if ( hits.hasOwnProperty(ts) ) {
                if ( Math.abs(xScale(ts) - mouse.relX) < 4 ) {
                    n.x = mouse.relX;
                    n.index = ts;
                    n.seriesIndex = 0;
                    n.event = true;
                    break;
                }
            }
        }
    },

    eventDrawHit: function(options) {
        var e = this.eventsOverlay,
            flotr = this,
            args            = options.args,
            ctx             = this.ctx;

        this.eventsOverlay.savedCanvas = ctx.getImageData(0, 0,
                flotr.canvasWidth, flotr.canvasHeight);

        var hits = this.options.events.hits[options.args.index];
        e.plotEvent(options.args.index, -1, hits.length, true, DRAW_ALL);
    },

    eventClearHit: function(options) {
        var args            = options.args,
            context         = options.context,
            xScale          = options.xScale,
            yScale          = options.yScale,
            lineWidth       = options.lineWidth,
            zero            = yScale(0),
            x               = xScale(args.x) - (2 * lineWidth),
            y               = yScale(args.yaxis.max),
            width           = lineWidth * 4,
            height          = zero - y;

        /*
         * XXX I wish there were a better way of doing this but it seems
         * like if we want to update outside the plot bounds, the only
         * way is to draw on the plot canvas (not the overlay)
         * Fortunately, this is fairly responsive with a canvas size of 800x300
         */

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.putImageData(this.eventsOverlay.savedCanvas, 0, 0);
    }

});

})();