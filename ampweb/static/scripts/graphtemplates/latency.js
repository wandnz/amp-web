/* Ajax request for high res data */
highResReq = undefined;
timeout = undefined;
timeset = undefined;

function Latency(object) {

    var summarydata = object.summarydata;
    var detaildata = object.detaildata;
    var container = object.container;

    /* Configure the detailed graph */
    var detailOptions = {
        name: 'detail',
        data: summarydata,
        height: 300,
        /* Flotr config */
        config: {
            HtmlText: false,
            title: ' ',
            'lite-lines': {
                show: true,
                fill: true,
                fillColor: '#CEE3F6'
            },
            yaxis: {
                min: 0,
                showLabels: true,
                autoscale: true,
                title: "Latency (ms)",
                margin: true,
                titleAngle: 90
            },
            xaxis: {
                showLabels: true,
                mode: "time",
                timeformat: "%h:%M:%S",
                timeMode: 'local',
                margin: true
            },
            grid: {
                color: "#0F0F0F",
                verticalLines: true,
                horizontalLines: true,
                outline : 'sw',
                outlineWidth: 1,
                labelMargin: 8
            }
        }
    };

    /* Configure the summary graph */
    var summaryOptions = {
        name: 'summary',
        data: detaildata,
        height: 70,
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
                labelMargin: 8,
                outline: 's',
                outlineWidth: 1,
                outlineColor: '#999999'
            }
        }
    };

    /* Fetches High-res data based on selection */
    summaryOptions.selectionCallback = (function(o) {
        timeset = o;
        window.clearTimeout(timeout);
        timeout = window.setTimeout(highres, 250);
    });

    function highres() {
        var starttime = Math.round(timeset.data.x.min / 1000);
        var endtime = Math.round(timeset.data.x.max / 1000);
        var url = "/api/_graph/highres/" + source + "/" + dest + "/" + starttime + "/" + endtime;

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

    /* Render Graph */
    vis.add(detail)
       .add(summary)
       .add(connection)
       .render(container);
                                        
    /* Wireup the interaction */
    interaction.leader(summary)
               .follower(detail)
               .follower(connection)
               .add(envision.actions.selection, summaryOptions.selectionCallback ? { callback : summaryOptions.selectionCallback } : null);
}
