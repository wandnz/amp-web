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
                labelMargin: 4
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
                labelMargin: 4 
            }
        }
    };

    /* Used to get timezone info */
    var dateString = (new Date()).toString();
    var add = dateString.split("GMT")[1].split(" ");
        add[1] = add[1].slice(1, add[1].length -1);
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
               .add(envision.actions.selection);
}
