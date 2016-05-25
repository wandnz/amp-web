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
        'flotr:click' : function(pos) {
            if (pos.hit) {
                this.eventsOverlay.showRatingModal(pos.hit);
            }
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

    getHue: function(severity) {
        if ( !this.options.events.severityColours )
            return 0;

        if ( this.options.events.categoriseSeverity ) {
            if ( severity < 33.3 )
                return 50;
            if ( severity < 66.6 )
                return 30;
            return 0;
        }

        severity = Math.min(severity, 100);
        severity = Math.max(severity, 0);
        return (50 - severity * 0.5);
    },

    getSaturation: function(severity) {
        return 100;
    },
    
    getLightness: function(severity) {
        if ( this.options.events.severityColours )
            return 50;

        severity = Math.min(severity, 100);
        return (30 - severity * 0.3) + 50; // lightness between 50 and 80
    },

    getLineColour: function(severity, hover) {
        if ( hover )
            return "#09c";

        var e = this.eventsOverlay,
            greyMarkers = this.options.events.greyMarkers ||
                    this.options.events.greyscale,
            greyLines = this.options.events.greyLines ||
                    this.options.events.greyscale,
            hue, saturation, lightness;

        if (greyLines && !greyMarkers)
            return "hsl(0, 0%, 80%)";

        hue = greyLines ? 0 : e.getHue(severity);
        saturation = greyLines ? 0 : e.getSaturation(severity);
        lightness = e.getLightness(severity);
        return "hsl("+hue+", "+saturation+"%, "+lightness+"%)";
    },

    getMarkerStrokeColour: function(severity, hover) {
        if ( hover )
            return "#09c"; // hover state

        var e = this.eventsOverlay,
            greyMarkers = this.options.events.greyMarkers ||
                    this.options.events.greyscale,
            greyLines = this.options.events.greyLines ||
                    this.options.events.greyscale,
            hue, saturation, lightness;

        hue = greyMarkers ? 0 : e.getHue(severity);
        saturation = greyMarkers ? 0 : e.getSaturation(severity);
        lightness = this.options.events.severityColours ? 50 : e.getLightness(severity);
        return "hsl("+hue+", "+saturation+"%, "+lightness+"%)";
    },

    getMarkerFillColour: function(severity, hover) {
        if ( hover )
            return "#33b5e5"; // hover state

        var e = this.eventsOverlay,
            greyMarkers = this.options.events.greyMarkers ||
                    this.options.events.greyscale,
            greyLines = this.options.events.greyLines ||
                    this.options.events.greyscale,
            hue, saturation, lightness;

        hue = greyMarkers ? 0 : e.getHue(severity);
        saturation = greyMarkers ? 0 : e.getSaturation(severity);
        lightness = this.options.events.severityColours ? 50 : e.getLightness(severity);
        lightness += (100 - lightness) / 2;
        return "hsl("+hue+", "+saturation+"%, "+lightness+"%)";
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
            x = Math.round(xScale(ts)),
            lineWidth = options.events.lineWidth,
            fontSize = options.fontSize;

        if ( x < plotOffset.left ||
                x > plotOffset.left + plotWidth )
            return;

        ctx.save();

        var lineStroke = lineWidth;
        var markerStroke = lineWidth;
        ctx.miterLimit = 0.1;

        if ( drawType == DRAW_ALL || drawType == DRAW_LINES ) {
            ctx.beginPath();
            ctx.strokeStyle = e.getLineColour(severity, hover);
            ctx.lineWidth = lineStroke;
            ctx.moveTo(x, plotHeight + plotOffset.top);
            ctx.lineTo(x, plotOffset.top);
            ctx.closePath();
            if ( plotHeight > 150 ) {
                ctx.lineWidth = lineStroke * 2;
            }
            ctx.stroke();

        }

        if ( drawType == DRAW_ALL || drawType == DRAW_MARKERS ) {
            var radius = this.plotHeight < 150 ? plotOffset.top / 3 :
                    plotOffset.top / 2;

            /* Draw another short line from the plot's top offset to (behind)
             * the start of the marker, to join the two together. We do this
             * because if we draw behind the data points, everything outside the
             * plot area gets erased before the afterdraw event, which is why we
             * still draw the markers separately afterwards
             */

            ctx.beginPath();
            ctx.strokeStyle = e.getLineColour(severity, hover);
            ctx.lineWidth = lineStroke;
            ctx.moveTo(x, plotOffset.top);
            ctx.lineTo(x, radius);
            ctx.closePath();
            ctx.stroke();

            /* Draw the marker */

            ctx.beginPath();
            ctx.miterLimit = 10;
            ctx.strokeStyle = e.getMarkerStrokeColour(severity, hover);
            ctx.fillStyle = e.getMarkerFillColour(severity, hover);
            ctx.lineWidth = markerStroke;
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

        /*
         * If there is more than one event at this time then mark it
         * with the event count
         */
        if ( count > 1 ) {
            var y = radius + lineWidth;

            ctx.save();
            ctx.translate(x, y);
            ctx.font = "" + fontSize + "pt Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#000";
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

        /* Take the left and bottom plot offsets into account, but remember
         * we need to keep the top offset to hover over markers */
        if ( mouse.relX <= 0 || mouse.relY > options.height ) {
            return;
        }

        for ( var ts in hits ) {
            if ( hits.hasOwnProperty(ts) ) {
                if ( Math.abs(xScale(ts) - mouse.relX) < 4 ) {
                    n.x = ts;
                    n.y = options.yInverse(mouse.relY);
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
            args = options.args;

        /*
         * I wish there were a better way of doing this but it seems like if we
         * want to update outside the plot bounds, the only way is to draw on
         * the plot canvas (not the overlay)
         * Fortunately, this is fairly responsive with a canvas size of 600x300.
         *
         * We need to save a copy of the canvas before we draw the overlay so
         * that when we clear the overlay, we can replace the canvas with the
         * copy we saved.
         */

        /* XXX Unfortunately, the free version of FlashCanvas doesn't support
         * the context.getImageData() method (so hits can't be drawn in IE8-).
         * We need to do a check here to prevent stalling the browser */
        if ( this.ctx.getImageData === undefined )
            return;

        this.eventsOverlay.savedCanvas = this.ctx.getImageData(0, 0,
                flotr.canvasWidth, flotr.canvasHeight);

        var hits = this.options.events.hits[options.args.index];
        var max_severity = 0;
        for ( var i = 0; i < hits.length; i++ ) {
            if ( hits[i].severity > max_severity )
                max_severity = hits[i].severity;
        }
        e.plotEvent(options.args.index, max_severity, hits.length, true, DRAW_ALL);
    },

    eventClearHit: function(options) {
        if ( this.ctx.putImageData === undefined)
            return;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.putImageData(this.eventsOverlay.savedCanvas, 0, 0);
    },

    showRatingModal: function(hit) {
        var index = hit.index;
        var evlist = hit.series.events.hits;

        if (!evlist.hasOwnProperty(index))
            return;

        $('#modal-rateevent').load(RATING_URL + "/" + evlist[index][0].eventid
                + "/" + evlist[index][0].streamid,
                function(response, status, xhr) {
                    if (status == "success")
                        ratingModal.setInitialState();
                        $('#modal-rateevent').modal('show');
                }
        );

    }

});

})();

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
