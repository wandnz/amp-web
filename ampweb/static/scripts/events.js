/*
 * Draw event markings onto a graph. Can be included with any other graph
 * type and will merge the two together to give a time series graph with
 * event markings.
 *
 * TODO make this draw behind the main time series data rather than on top
 */
Flotr.addType('events', {
    options: {
	show: false,
	lineWidth: 2,
    },

    /**
     * Draws events in the canvas element.
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
     * Ignore the data series and plot vertical lines for events based on
     * the events array set in the options. The format of a single event is:
     * {
     *	    ts: <timestamp in milliseconds>,
     *	    description: <test to display in tooltip>,
     *	    severity: <how important this event appears to be>
     * }
     */
    plot : function (options) {

	var
	context   = options.context,
	xScale    = options.xScale,
	yScale    = options.yScale,
	events    = options.events,
	lineWidth = options.lineWidth,
	length, i;

	if ( events == undefined || events.length < 1 ) {
	    return;
	}

	length = events.length;

	/* for each event, draw a line the full height of the graph */
	var max_severity = 0;
	for ( i = 0; i < length; i++ ) {
	    context.beginPath();
	    context.lineWidth = lineWidth;
	    /* don't replot a line of a lower severity */
	    /* TODO only plot a single line per event, regardless of order */
	    /* TODO mark multi-event lines with a count digit? */
	    if ( i > 0 && events[i-1].ts == events[i].ts &&
		    events[i].severity <= max_severity ) {
		continue;
	    }
	    /* change colour based on severity */
	    if ( events[i].severity < 30 ) {
		context.strokeStyle = 'rgba(255, 200, 0, 1.0)';
	    } else if ( events[i].severity < 60 ) {
		context.strokeStyle = 'rgba(255, 128, 0, 1.0)';
	    } else {
		context.strokeStyle = 'rgba(255, 0, 0, 1.0)';
	    }
	    context.moveTo(xScale(events[i].ts), yScale(0));
	    context.lineTo(xScale(events[i].ts), yScale(0) - options.height);
	    context.stroke();
	    max_severity = events[i].severity;
	}
    },

    /*
     * Check for a mouse hit on one of the event markers. If we get a hit we
     * can highlight it and show some more detailed information.
     */
    hit : function (options) {
	var
	events = options.events,
	args = options.args,
	xScale = options.xScale,
	yScale = options.yScale,
	mouse = args[0],
	n = args[1],
	x = options.xInverse(mouse.relX),
	relY = mouse.relY,
	length, i;

	if ( events == undefined || events.length < 1 ) {
	    return;
	}

	length = events.length;

	for (i = 0; i < length; i++) {
	    /*
	     * Check if the mouse is close enough to trigger the selection of
	     * an event. May want to adjust this once we actually use it and
	     * can see how event selection works on busy graphs.
	     */
	    if ( Math.abs(xScale(events[i].ts) - mouse.relX) < 4 ) {
		n.x = events[i].ts;
		n.index = i;
		n.seriesIndex = options.index;
		break;
	    }
	}
    },

    /*
     * Draw the result of the mouse hit, highlighting the currently selected
     * event line.
     */
    drawHit : function (options) {
	var
	args            = options.args,
	context         = options.context,
	xScale          = options.xScale,
	yScale          = options.yScale,
	zero            = yScale(0),
	x               = xScale(args.x);

	context.save();
	context.beginPath();
	/* highlight with a double thickness line, bright blue */
	context.lineWidth = options.lineWidth * 2;
	context.strokeStyle = 'rgba(0, 0, 255, 1.0)';
	context.moveTo(x, zero);
	context.lineTo(x, zero - options.height);
	context.closePath();
	context.stroke();
	context.restore();
    },

    /*
     * Clear the highlighting on the currently selected event.
     */
    clearHit : function (options) {
	var
	args            = options.args,
	context         = options.context,
	xScale          = options.xScale,
	yScale          = options.yScale,
	lineWidth       = options.lineWidth,
	zero            = yScale(0),
	x               = xScale(args.x) - (2 * lineWidth),
	y               = yScale(args.yaxis.max),
	width		= lineWidth * 4,
	height		= zero - y;

	/* top left x, top left y, width, height */
	context.clearRect(x, y, width, height);
    },
});
