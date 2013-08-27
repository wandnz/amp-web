
/*
 * Draw a time series line graph showing roughly when events occurred (binned
 * at 30 minute intervals to actually have numbers greater than one appear
 * on the plot).
 */
function drawEventFrequencies(object) {
    var container = object.container;
    var url = object.urlbase + "/" + object.start + "/" + object.end;

    request = $.getJSON(url, function (data) {
        Flotr.draw(container,
            [
                { color: "rgba(51, 102, 204, 1.0)", data: data },
                //{ label:"groups", color: "red", data:data["groups"] }
            ], {
            lines: {
                show: true,
                fill: true,
                fillOpacity: 1.0,
            },
            xaxis: {
                mode: "time",
                timeFormat: "%h:%M %b %d",
                timeMode: "local",
                /* TODO stop ticks from being so sparse. flotr won't listen */
                //tickSize: [4, "hour"],
            },
            yaxis: {
                min: 0,
            },
            /* do we want tooltips, are they useful? */
            mouse: {
                track: true,
                relative: true,
                sensibility: 5,
                trackFormatter: function(o) {
                    var date = new Date(Math.round(o.x));
                    var desc = date.toLocaleString();
                    desc += "<br />";
                    desc += "Events: " + Math.round(o.y);
                    return desc;
                },
            },
        });
    });
}

/*
 * Draw a bar graph showing the sources/targets that have the most events
 * in the last time period. Limit it to the 5 largest.
 */
function drawEventSiteFrequencies(object) {
    var container = object.container;
    var url = object.urlbase + "/" + object.start + "/" + object.end;
    var name_cutoff = 21;
    var max_sites = 5;

    request = $.getJSON(url, function (data) {

        /* build data array and ticks array together */
        var sites = [];
        var labels = [];
        var label;
        var max;

        /* limit the graph to showing no more than 5 bars */
        max = Math.min(max_sites, data.length);
        for ( i = 0; i < max; i++ ) {
            /* array is back to front because of the horizontal bars */
            sites.push([data[i].count, max - i]);
            label = data[i].site;
            /* shorten any long labels as they impact the graph width */
            if ( label.length > name_cutoff ) {
                label = label.substr(0, name_cutoff) + "...";
            }
            /*
             * label array is simply value:label, so it appears to be the
             * right way around.
             */
            labels.push([max - i, label]);
        }

        Flotr.draw(container,
            [
                { color: "rgba(51, 102, 204, 1.0)", data: sites },
            ], {
            bars: {
                show: true,
                horizontal: true,
                fillOpacity: 1.0,
            },
            xaxis: {
                /* TODO make ticks whole numbers only */
                min: 0,
            },
            yaxis: {
                /* TODO a gap between bars would be nicer looking? */
                ticks: labels,
            },
        });
    });
}