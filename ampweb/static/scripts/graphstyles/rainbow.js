function RainbowGraph(params) {
    BasicTimeSeriesGraph.call(this, params);

    /* Override the basic line style with our rainbow style */
    this.configureStyle = function() {
        var detopts = this.detailgraph.options,
            sumopts = this.summarygraph.options;

        detopts.config.rainbow =
                jQuery.extend(true, {}, CuzRainbowConfig);
        sumopts.config.rainbow =
                jQuery.extend(true, {}, CuzRainbowConfig);

        if ("measureLatency" in params) {
            sumopts.config.rainbow.measureLatency =
                    params.measureLatency;
            detopts.config.rainbow.measureLatency =
                sumopts.config.rainbow.measureLatency;

            if ( "minHopHeight" in params )
                detopts.config.rainbow.minHopHeight = params.minHopHeight;
        }

        if ( !detopts.config.rainbow.measureLatency )
            detopts.config.rainbow.minHopHeight = 0;

        sumopts.config.rainbow.minHopHeight = 0;
    }

    /**
     * As well as defining all the usual necessary variables,
     * this method also organises the data into plots, keyed by host,
     * that will be used for all future data references including
     * plotting the graph and calculating values to display when
     * mouse tracking is enabled
     */
    this.processSummaryData = function(sumdata) {
        var sumopts = this.summarygraph.options;
        var detopts = this.detailgraph.options;

        var measureLatency = detopts.config.rainbow.measureLatency;

        /* This is pretty easy -- just copy the data (by concatenating an
         * empty array onto it) and store it with the rest of our graph options
         */
        sumopts.data = []
        /* add the initial series back on that we use for eventing */
        sumopts.data.push([]);

        for ( var line in sumdata ) {
            sumopts.data.push( {
                name: line,
                data: sumdata[line].concat([]),
                events: {
                    /* only the first series needs to show these events */
                    show: false,
                }
            });
        }

        /*
         * Populate a list of plots for each host (as we want to
         * identify each host easily in the graph) so that we can
         * then plot the graph by looping linearly through the
         * hosts rather than the individual data points
         * This will also allow us to highlight the plot for a
         * particular host in its entirety
         */

        var plots = {};

        var points = [];

        // TODO are we always going to get data in [1]?
        var data = (sumopts.data.length > 1) ? sumopts.data[1].data : [];

        var p = 0;
        for ( var i = 0; i < data.length; i++ ) {
            var timestamp   = data[i][0],
                errorType   = data[i][1],
                errorCode   = data[i][2],
                hopCount    = data[i][3],
                hops        = data[i][4];

            /* ignore the most recent data point as we don't have
             * a point to extend its bars to */
            if ( i + 1 == data.length )
                break;

            var nextTimestamp = data[i+1][0];

            /* ignore a point on the timeline where data is null */
            if ( hops == null )
                continue;

            var j, latency;

            for ( j = 0; j < hopCount; j++ ) {
                var host = hops[j][0];
                latency = hops[j][1];

                if ( !(host in plots) )
                    plots[host] = [];

                var hop = {
                    "host": host,
                    "point": p++,
                    "x0": timestamp,
                    "x1": nextTimestamp,
                    "y0": measureLatency ? latency : j + 1,
                    "y1": measureLatency ? (j > 0 ? hops[j-1][1] : 0) : j
                };

                plots[host].push(hop);
                points.push(hop);
            }

            /* highlight a point on the timeline containing an error */
            if ( errorType > 0 ) {
                var host = "Error";

                if ( !(host in plots) )
                    plots[host] = [];

                var hop = {
                    "host": host,
                    "point": p++,
                    "x0": timestamp,
                    "x1": nextTimestamp,
                    "y0": measureLatency ? latency+(latency/hopCount) : j + 1,
                    "y1": measureLatency ? latency : j,
                    "errorType": errorType,
                    "errorCode": errorCode
                };

                plots[host].push(hop);
                points.push(hop);
            }
        }

        sumopts.config.rainbow.plots = plots;
        detopts.config.rainbow.plots = plots;

        sumopts.config.rainbow.points = points;
        detopts.config.rainbow.points = points;

        this.determineSummaryStart();

        /* Update the X axis and generate some new tics based on the time
         * period that we're covering.
         */
        sumopts.config.xaxis.min = this.summarygraph.start * 1000.0;
        sumopts.config.xaxis.max = this.summarygraph.end * 1000.0;
        sumopts.config.xaxis.ticks =
                generateSummaryXTics(this.summarygraph.start,
                                     this.summarygraph.end);

        /* Make sure we autoscale our yaxis appropriately */
        if ( this.maxy == null ) {
            sumopts.config.yaxis.max = this.findMaximumY(sumopts.data,
                    this.summarygraph.start, this.summarygraph.end) * 1.1;
        }
    }

    /**
     * Determines the maximum value of the y axis for the given
     * range of data points (all data falling within start and end)
     */ 
    this.findMaximumY = function(data, start, end) {
        var maxy = null;

        for ( var series = 0; series < data.length; series++ ) {
            var startIndex = null;

            if ( data[series].length == 0 ) {
                continue;
            }

            var length = data[series].data.length;

            for ( var i = 0; i < length; i++ ) {
                var timestamp = data[series].data[i][0];

                if ( startIndex === null ) {
                    /* ignore values until we find one in range of the graph */
                    if ( timestamp >= start * 1000 ) {
                        /* compare with the value one less than the start
                         * point, as this is the point that draws the first
                         * bar that comes on screen from the left */
                        startIndex = i > 0 ? i - 1 : i;
                        break;
                    } else {
                        /* data still out of graph range, continue */
                        continue;
                    }
                }
            }

            for ( i = startIndex; i < length; i++ ) {
                var datum = data[series].data[i];
                
                if (datum === undefined)
                    break;

                var timestamp = datum[0];
                    errorType = datum[1],
                    hopCount = datum[3],
                    hops = datum[4];

                /* Stop before we get to a value outside the range of the
                 * graph */
                if ( timestamp > end * 1000 ) {
                    break;
                }

                if (this.summarygraph.options.config.rainbow.measureLatency) {
                    if ( hops == null || hops.length == 0 )
                        continue;
                    var latency = hops[hops.length - 1][1];

                    if ( errorType > 0 )
                        latency += latency / hops.length;

                    if ( latency > maxy )
                        maxy = latency;
                } else {
                    /* If we need to tack an error 'hop' on the end, increase the
                     * hop count by one */
                    if ( errorType > 0 )
                        hopCount++;

                    /* Update maxy if applicable */
                    if ( hopCount > maxy && hops != null )
                        maxy = hopCount;
                }
            }
        }

        if ( maxy == 0 || maxy == null ) {
            return 1;
        }

        return maxy;
    }

    this.detailgraph.options.config.yaxis.tickDecimals = 0;
    this.detailgraph.options.config.mouse.track = true;

    this.detailgraph.options.config.mouse.trackFormatter =
            RainbowGraph.prototype.displayTooltip;
}

RainbowGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
RainbowGraph.prototype.constructor = RainbowGraph;

RainbowGraph.prototype.displayTooltip = function(o) {
    if (o.nearest.event) {
        return BasicTimeSeriesGraph.prototype.displayEventTooltip(o);
    }

    var measureLatency = o.series.rainbow.measureLatency;

    var plots = o.series.rainbow.plots;
    var points = o.series.rainbow.points;

    if ( !(o.index in points) )
        return "Unknown point";

    var point = points[o.index]
        x0 = point.x0,
        x1 = point.x1,
        y0 = point.y0,
        y1 = point.y1,
        host = point.host,
        errorType = point.errorType,
        errorCode = point.errorCode;

    var startDate = convertToTime( new Date(Math.floor(x0)) );
    var endDate = convertToTime( new Date(Math.floor(x1)) );

    var errorDesc = null;
    if ( errorType > 0 ) {
        errorDesc = "Unknown error ("+errorType+"."+errorCode+")";
        if ( errorType in errorCodes ) {
            if (errorCode in errorCodes[errorType]) {
                errorDesc = errorCodes[errorType][errorCode];
            }
        }
    }

    var hopDesc = "";

    if ( !measureLatency ) {
        var hops = [];
        for ( var j = 0; j < plots[host].length; j++ ) {
            if ( x0 == plots[host][j]["x0"] ) {
                hops.push(plots[host][j]["y0"]);
            }
        }
        
        if ( hops.length == 1 )
            hopDesc = "Hop " + hops[0];
        else if ( hops.length > 1 ) {
            hopDesc += "Hops ";
            for ( j = 0; j < hops.length; j++ ) {
                hopDesc += hops[j];
                if ( j + 1 < hops.length )
                    hopDesc += ",";
            }
        }
    } else {
        hopDesc = "Latency: " + (y0 / 1000) + "ms";
    }

    return (errorType > 0 ? errorDesc : host + "<br />" +
            hopDesc) ;
}

/* TODO Unify with Flotr2 dates as appear on axes
 * Although this code *should* produce dates of the same
 * format, it would be nicer to keep this together */
function convertToTime(unixTimestamp) {
    var a = new Date(unixTimestamp);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug',
            'Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var day = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();

    return month + ' ' + day + ', ' + hour + ':' +
            min.padLeft(2) + ':' + sec.padLeft(2);
}

Number.prototype.padLeft = function(n, str) {
    return Array(n-String(this).length+1).join(str||'0')+this;
}

var errorCodes = {
    0: {
        0: "Echo reply (used to ping)"
    },
    3: {
        0: "Destination network unreachable",
        1: "Destination host unreachable",
        2: "Destination protocol unreachable",
        3: "Destination port unreachable",
        4: "Fragmentation required, and DF flag set",
        5: "Source route failed",
        6: "Destination network unknown",
        7: "Destination host unknown",
        8: "Source host isolated",
        9: "Network administratively prohibited",
        10: "Host administratively prohibited",
        11: "Network unreachable for TOS",
        12: "Host unreachable for TOS",
        13: "Communication administratively prohibited",
        14: "Host Precedence Violation",
        15: "Precedence cutoff in effect"
    },
    4: {
        0: "Source quench (congestion control)"
    },
    5: {
        0: "Redirect Datagram for the Network",
        1: "Redirect Datagram for the Host",
        2: "Redirect Datagram for the TOS & network",
        3: "Redirect Datagram for the TOS & host"
    },
    8: {
        0: "Echo request (used to ping)"
    },
    9: {
        0: "Router Advertisement"
    },
    10: {
        0: "Router discovery/selection/solicitation"
    },
    11: {
        0: "TTL expired in transit",
        1: "Fragment reassembly time exceeded"
    },
    12: {
        0: "Pointer indicates the error",
        1: "Missing a required option",
        2: "Bad length"
    },
    13: {
        0: "Timestamp"
    },
    14: {
        0: "Timestamp reply"
    },
    15: {
        0: "Information Request"
    },
    16: {
        0: "Information Reply"
    },
    17: {
        0: "Address Mask Request"
    },
    18: {
        0: "Address Mask Reply"
    }
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :