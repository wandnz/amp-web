function RainbowGraph(params) {
    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "rainbow";

    this.detailgraph.options.config.yaxis.tickDecimals = 0;

    /* Override the basic line style with our rainbow style */
    this.configureStyle = function() {
        var detopts = this.detailgraph.options,
            sumopts = this.summarygraph.options;

        detopts.config.rainbow = jQuery.extend(true, {}, CuzRainbowConfig);
        sumopts.config.rainbow = jQuery.extend(true, {}, CuzRainbowConfig);

        if ("measureLatency" in params) {
            sumopts.config.rainbow.measureLatency = params.measureLatency;
            detopts.config.rainbow.measureLatency =
                sumopts.config.rainbow.measureLatency;

            if ( "minHopHeight" in params )
                detopts.config.rainbow.minHopHeight = params.minHopHeight;
        }

        if ( !detopts.config.rainbow.measureLatency )
            detopts.config.rainbow.minHopHeight = 0;

        sumopts.config.rainbow.minHopHeight = 0;
    }

    this.formDataURL = function() {
        var url = this.dataurl + "hops-full/" + this.lines[0].id;
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;
        return url;
    }

    this.formSummaryURL = function(start, end) {
        var url = this.dataurl + "hops-summary/" +  this.lines[0].id;
        url += "/" + start + "/" + end;
        return url;
    }

    this.__processSummaryData = this.processSummaryData;
    this.processSummaryData = function(sumdata) {
        this.__processSummaryData(sumdata);

        /*
         * Organise the data into plots, keyed by host, that will be used for
         * all future data references
         */
        var sumopts = this.summarygraph.options;
        var measureLatency = sumopts.config.rainbow.measureLatency;

        var processed = this.convertDataToRainbow(sumopts.data, measureLatency);
        sumopts.config.rainbow.plots = processed.plots;
        sumopts.config.rainbow.points = processed.points;
    }

    this.__processDetailedData = this.processDetailedData;
    this.processDetailedData = function(detaildata) {
        this.__processDetailedData(detaildata);

        /*
         * Organise the data into plots, keyed by host, that will be used for
         * all future data references including plotting the graph and
         * calculating values to display when mouse tracking is enabled
         */
        var detopts = this.detailgraph.options;
        var measureLatency = detopts.config.rainbow.measureLatency;
        
        var processed = this.convertDataToRainbow(detopts.data, measureLatency);
        detopts.config.rainbow.plots = processed.plots;
        detopts.config.rainbow.points = processed.points;
    }

    this.convertDataToRainbow = function(dataseries, measureLatency) {
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

        /* Find the first non-empty data series */
        var data = []
        for (var i = 1; i < dataseries.length; i ++) {
            if (dataseries[i].data.series.length != 0) {
                data = dataseries[i].data.series;
                break;
            }
        }
       
        var p = 0;
        for ( var i = 0; i < data.length; i++ ) {
            var timestamp   = data[i][0],
                hopCount    = data[i][1],
                hops        = data[i][2];

            /* ignore the most recent data point as we don't have
             * a point to extend its bars to */
            if ( i + 1 == data.length )
                break;

            var nextTimestamp = data[i+1][0];

            var j, latency, startlatency = 0;

            /* ignore the case where data is null */
            if ( hops != null ) {
                for ( j = 0; j < hopCount; j++ ) {
                    var pointhops = [];
                    var host = hops[j][0];
                    latency = hops[j][1];

                    if ( !(host in plots) )
                        plots[host] = [];

                    /* y1 is the 'start' of the hop, y0 is the 'top' of the hop */
                    y0_hopcount = j + 1;
                    y1_hopcount = j;
                    y1_latency = startlatency;
                    y0_latency = startlatency + latency;
                    pointhops.push(j+1);

                    /* Group consecutive equal hops into a single hop */ 
                    while (j + 1 < hopCount && host == hops[j+1][0]) {
                        /* +2 because internally hops are indexed from zero
                         * but when displaying tooltips they will be indexed
                         * from 1.
                         */
                        pointhops.push(j+2);
                        y0_hopcount = j + 2;
                        y1_latency += hops[j+1][1]
                        j++;
                    }

                    var hop = {
                        "host": host,
                        "point": p++,
                        "hopids": pointhops,
                        "x0": timestamp,
                        "x1": nextTimestamp,
                        "y0": measureLatency ? y0_latency : y0_hopcount,
                        "y1": measureLatency ? y1_latency : y1_hopcount
                    };

                    plots[host].push(hop);
                    points.push(hop);
                    startlatency = y0_latency;
                }
            }

            /* highlight a point on the timeline containing an error */
            /*
            if ( errorType > 0 ) {
                var host = "Error";

                if ( !(host in plots) )
                    plots[host] = [];

                var hop = {
                    "host": host,
                    "point": p++,
                    "x0": timestamp,
                    "x1": nextTimestamp,
                    "y0": measureLatency ? 0 : j + 1, // height -> minHopHeight
                    "y1": measureLatency ? latency : j,
                    "errorType": errorType,
                    "errorCode": errorCode
                };

                plots[host].push(hop);
                points.push(hop);
            }
            */
        }

        return { "plots": plots, "points": points }
        
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
            
            var currseries = data[series].data.series;
            var length = currseries.length;

            if ( startIndex === null ) {
                for ( var i = 0; i < length; i++ ) {
                    var timestamp = currseries[i][0];

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

            if (startIndex === null)
                continue;

            for ( i = startIndex; i < length; i++ ) {
                var datum = currseries[i];
                
                if (datum === undefined)
                    break;

                var timestamp = datum[0];
                    hopCount = datum[1],
                    hops = datum[2];

                /* Stop before we get to a value outside the range of the
                 * graph */
                if ( timestamp > end * 1000 ) {
                    break;
                }

                if ( this.summarygraph.options.config.rainbow.measureLatency ) {
                    if ( hops == null || hops.length == 0 )
                        continue;

                    /* Find the highest latency out of all data points -
                     * Necessary for graphing traceroutes where the last hop
                     * is not necessarily the highest latency (even though it
                     * generally should be) */
                    var maxLatency = 0;
                    for ( var j = 0; j < hops.length; j++ ) {
                        if ( hops[j][1] > maxLatency )
                            maxLatency = hops[j][1];
                    }

                    /* This is awkward. If we need to add an error 'hop',
                     * we want to make its height yScale(minHopHeight), but
                     * yScale is a function based on the height of the Y axis!
                     * Fortunately the axis is multiplied by 1.1 after its max
                     * value is calculated, which will be sufficient to see an
                     * error stacked on top of the max value.
                     * (If we were going to add an extra latency value, we would
                     * do so here.)
                     */

                    if ( maxLatency > maxy )
                        maxy = maxLatency;
                } else {
                    /* Update maxy if applicable */
                    if ( hopCount > maxy && hops != null )
                        maxy = hopCount;
                }
            }
        }

        if ( maxy < 4 || maxy == null ) {
            return 4;
        }

        return maxy + 1;
    }

    this.errorCodes = {
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

    this.displayTooltip = function(o) {
        if (o.nearest.event) {
            return this.displayEventTooltip(o);
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

        var errorDesc = null;
        if ( errorType > 0 ) {
            var errorCodes = this.errorCodes;
            errorDesc = "Unknown error ("+errorType+"."+errorCode+")";
            if ( errorType in errorCodes ) {
                if (errorCode in errorCodes[errorType]) {
                    errorDesc = "Error: " + errorCodes[errorType][errorCode];
                }
            }
        }

        var hopDesc = "";

        if ( !measureLatency ) {
            var hops = [];
            for ( var j = 0; j < plots[host].length; j++ ) {
                if ( x0 == plots[host][j]["x0"] ) {
                    hops = hops.concat(plots[host][j]["hopids"]);
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

        return (errorType > 0 ? errorDesc : host + "<br />" + hopDesc);
    }
}

RainbowGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
RainbowGraph.prototype.constructor = RainbowGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
