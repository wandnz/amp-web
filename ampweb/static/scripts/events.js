/*
 * Draw event markings onto a graph. Can be included with any other graph
 * type and will merge the two together to give a time series graph with
 * event markings.
 *
 * Will try to merge events that occur within the same bin in order not to
 * fill the entire graph with overlapping event lines. The bin size is
 * currently pretty arbitrary at twice the size (divisor 150) of the data
 * binning (divisor 300) - any smaller and the lines overlap/touch. Any
 * merged events are marked by a number at the top of the event line that
 * describes how many events are represented.
 *
 * One possible drawback of the binning is that nearby events can be in
 * different bins if they fall either side of the boundary, while events that
 * are further apart but in the same bin will be aggregated. At the moment
 * this seems an acceptable way to reduce the clutter.
 *
 * TODO make this draw behind the main time series data rather than on top
 * TODO can we do something smart here that means it is only drawn once rather
 * than for every single series that has it enabled? Would be nice to enable
 * it globally and not have to disable it on every series except an empty
 * dummy series.
 */
Flotr.addType('events', {
    options: {
	show: false,
	lineWidth: 2,
	fontSize: Flotr.defaultOptions.fontSize,
	binDivisor: 150.0,
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
	xInverse  = options.xInverse,
	yScale    = options.yScale,
	events    = options.events,
	lineWidth = options.lineWidth,
	lineLength = options.height - options.fontSize - 3,
	div	  = options.binDivisor,
	binsize = Math.round((xInverse(options.width) - xInverse(0)) / div),
	bin_ts = 0,
	max_severity = 0,
	event_count = 0,
	length, i;

	if ( events == undefined || events.length < 1 ) {
	    return;
	}

	length = events.length;

	/*
	 * Select a line colour based on event severity. This is mostly just
	 * to show that we can do it, probably needs some more thought put
	 * into what colours to use and what sort of scale.
	 */
	function get_colour(severity) {
	    if ( severity < 30 ) {
		return "rgba(255, 200, 0, 1.0)";
	    } else if ( severity < 60 ) {
		return "rgba(255, 128, 0, 1.0)";
	    }
	    return "rgba(255, 0, 0, 1.0)";
	}

	/*
	 * Draw a vertical line to mark an event, annotating it if appropriate
	 * to show how many events it represents (if merged/aggregated).
	 *
	 * TODO Is a line from the bottom of the graph to near the top the
	 * best way to show events? Do they get in the way? Can they be
	 * confused with peaks of data?
	 */
	function plot_line(context, ts, severity, count) {
	    context.beginPath();
	    context.lineWidth = options.lineWidth;
	    context.strokeStyle = get_colour(severity);
	    context.moveTo(xScale(ts), yScale(0));
	    /* don't draw all the way to the top, leave room for a digit */
	    context.lineTo(xScale(ts), yScale(0) - lineLength);
	    context.stroke();
	    if ( count > 1 ) {
		/*
		 * If there is more than one event at this time then mark it
		 * with the event count.
		 */
		/* TODO consider groups of events that require two digits */
		var x = xScale(ts) - (options.fontSize / 2.0);
		var y = yScale(0) - lineLength;
		Flotr.drawText(context, event_count, x, y,
			{ size: options.fontSize });
	    }
	}

	/*
	 * Check each event bin to see if we need to merge any events, and
	 * then display a line for each event bin containing events.
	 */
	for ( i = 0; i < length; i++ ) {
	    if ( bin_ts > 0 &&
		    (events[i].ts - (events[i].ts % binsize)) == bin_ts ) {
		event_count++;
		/* update severity if this simultaneous event is bigger */
		if ( events[i].severity > max_severity ) {
		    max_severity = events[i].severity;
		}
		continue;
	    }

	    if ( bin_ts > 0 ) {
		/* if this event is far enough away, display previous one */
		plot_line(context, bin_ts, max_severity,
			event_count, lineWidth);
	    }

	    /* new event or first event, reset statistics */
	    bin_ts = events[i].ts - (events[i].ts % binsize);
	    event_count = 1;
	    max_severity = events[i].severity;
	}
	if ( event_count > 0 ) {
	    plot_line(context, bin_ts, max_severity, event_count, lineWidth);
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
	xInverse = options.xInverse,
	xScale = options.xScale,
	yScale = options.yScale,
	mouse = args[0],
	n = args[1],
	x = options.xInverse(mouse.relX),
	relY = mouse.relY,
	div = options.binDivisor,
	binsize = Math.round((xInverse(options.width) - xInverse(0)) / div),
	length, i, bin_ts;

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
	    bin_ts = events[i].ts - (events[i].ts % binsize);
	    if ( Math.abs(xScale(bin_ts) - mouse.relX) < 4 ) {
		n.x = bin_ts;
		n.index = i;
                /*
                 * Any events will only take place on series 0, which is the
                 * initial empty series added just to display these events.
                 */
                n.seriesIndex = 0;
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
	x               = xScale(args.x),
	lineLength	= options.height - options.fontSize - 3;

	context.save();
	context.beginPath();
	/* highlight with a double thickness line, bright blue */
	context.lineWidth = options.lineWidth * 2;
	context.strokeStyle = 'rgba(0, 0, 255, 1.0)';
	context.moveTo(x, zero);
	context.lineTo(x, zero - lineLength);
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
