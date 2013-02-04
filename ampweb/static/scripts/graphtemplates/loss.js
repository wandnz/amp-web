/* Ajax request for high res data */
highResReq = undefined;
timeout = undefined;
timeset = undefined;

function Loss(object) {
    var summarydata = object.summarydata;
    var detaildata = object.detaildata;
    var container = object.container;

    /* Configure the detailed graph */
    var detailOptions = {
        name: 'detail',
        data: summarydata,
        height: 320,
        /* Flotr config */
        config: {
            HtmlText: false,
            'lite-lines': {
                    show: true,
                    fill: true,
                    fillColor: '#CEE3F6'
            },
            selection: {
                mode: 'x'
            },
            yaxis: {
                min: 0,
                max: 105,
                showLabels: true,
                title: "Loss (%)",
                margin: true,
                titleAngle: 90
            },
            xaxis: {
                showLabels: true,
                mode: "time",
                timeformat: "%h:%M:%S",
                timeMode: 'local',
                margin: true,
                min: object.start,
                max: object.end
            },
            grid: {
                verticalLines: true,
                horizontalLines: true,
                outline : 'sw',
                outlineWidth: 1,
                labelMargin: 4
            }
        }
    };

    /* Configure the summary graph */
    var summaryOptions = {
        name: 'summary',
        data: detaildata,
        height: 70,
        selection: {
            data: {
                x: {
                    min : object.start,
                    max : object.end
                }
            }
        },
        /* Flotr config */
        config: {
            HtmlText: false,
            'lite-lines': {
                show: true,
                fill: true,
                fillColor: '#CEE3F6'
            },
            selection: {
                mode: 'x'
            },
            yaxis: {
                autoscale: true,
                min: 0
            },
            xaxis: {
                showLabels: true,
                title: "Time (Local)",
                mode: "time",
                timeformat: "%h:%M:%S",
                timeMode: 'local',
                margin: true
            },
            grid: {
                color: "#0F0F0F",
                verticalLines: true,
                labelMargin: 4,
                outline: 'ns',
                outlineWidth: 1,
                outlineColor: '#999999'
            }
        }
    };

    var zoomOptions = {};  


    /* Fetches High-res data based on selection */
    summaryOptions.selectionCallback = (function(o) {
        timeset = o;
        window.clearTimeout(timeout);
        timeout = window.setTimeout(highres, 250);
    });

    /* Fetches High-res data based on selection (detail graph) */
    zoomOptions.selectionCallback = (function(o) {
        timeset = o;
        window.clearTimeout(timeout);
        timeout = window.setTimeout(function() {
            /* Selection on summary graph */        
            summary.trigger('select', {
                data : {
                  x : {
                    min : o.data.x.min,
                    max : o.data.x.max
                  }
                }
            });
            highres();
        }, 250);
    });

    function highres() {
        var starttime = Math.round(timeset.data.x.min / 1000);
        var endtime = Math.round(timeset.data.x.max / 1000);
        var url = "/api/_graph/highres/loss/" + source + "/" + dest + "/" + starttime + "/" + endtime;

        /* Abort outstanding requests */
        if (highResReq && highResReq.readyState != 4) {
            highResReq.abort();
        }

        highResReq = $.getJSON(url, function(data) {
            /* Merge in Data, then make the selection on the new data */            
            update(data);
            detailOptions.config.xaxis.min = timeset.data.x.min;
            detailOptions.config.xaxis.max = timeset.data.x.max;
            for (index in interaction.followers) {
                interaction.followers[index].draw();            
            }
        });
    }

    /* Updates low res data with high res data where available */
    function update(highres) {
        var alldata = [[],[]];
        /* Go through all the options for current data, and merge in high res */        
        for (var i = 0; i < detailOptions.data[0].length; i++) {
            if (highres[0][0]) {
                if (highres[0][0] < detailOptions.data[0][i]) {
                    alldata[0].push(highres[0][0]);
                    alldata[1].push(highres[1][0]);
                    highres[0].splice(0, 1);
                    highres[1].splice(0, 1);
                    i--;
                    continue;
                }
                if (highres[0][0] == detailOptions.data[0][i]) {
                    alldata[0].push(highres[0][0]);
                    alldata[1].push(highres[1][0]);
                    highres[0].splice(0, 1);
                    highres[1].splice(0, 1);
                }
                if (highres[0][0] > detailOptions.data[0][i]) {
                    alldata[0].push(detailOptions.data[0][i]);
                    alldata[1].push(detailOptions.data[1][i]);
                }
            }    
            else
            {
                alldata[0].push(detailOptions.data[0][i]);
                alldata[1].push(detailOptions.data[1][i]);
            }      
        }
        

        /* In case high res data left over */
        for (var i = 0; i < highres[0].length; i ++) {
            alldata[0].push(highres[0][i]);
            alldata[1].push(highres[1][i]);
        }       
        
        /* Update Flotr2's data (actual graph data) */        
        detailOptions.data = alldata;
    }


    /* Used to get timezone info */
    var dateString = (new Date()).toString();
    var add;
    if (dateString.split("GMT")[1]) {
        dateString = dateString.split("GMT");
        add = dateString[1].split(" ");
        add[1] = "UTC";
    }
    else {
        dateString = dateString.split("UTC");
        add = dateString[1].split(" ");
        add[1] = "UTC";
    }
    summaryOptions.config.xaxis.title = "Time (" + add[1] + " " + add[0] + ")";

    /* Get the graph ready */
    var vis = new envision.Visualization();
    var detail = new envision.Component(detailOptions);
    var summary = new envision.Component(summaryOptions);
    var interaction = new envision.Interaction();
    var connection = new envision.Component({name: 'ampweb-latency-connection', adapterConstructor: envision.components.QuadraticDrawing});  
    var zoom = new envision.Interaction();
        zoom.group(detail);
        zoom.add(envision.actions.zoom, zoomOptions.selectionCallback ? { callback : zoomOptions.selectionCallback } : null);

    /* Render Graph */
    vis.add(detail);
    vis.add(summary);
    vis.add(connection);
    vis.render(container);
                                        
    /* Wireup the interaction */
    interaction.leader(summary);
    interaction.follower(detail);
    interaction.follower(connection);
    interaction.add(envision.actions.selection);
}
