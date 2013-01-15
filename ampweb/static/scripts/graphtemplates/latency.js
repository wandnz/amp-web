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
                margin: true
            },
            grid: {
                color: "#0F0F0F",
                verticalLines: true,
                horizontalLines: true,
                outlineWidth: 0
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
            selection: {
                mode: 'x'
            },
            xaxis: {
                showLabels: true,
                title: "Time (Local)",
                mode: "time",
                timeformat: "%h:%M:%S",
                margin: true
            },
            yaxis: {
                autoscale: true,
                min: 0
            },
            grid: {
                color: "#0F0F0F",
                verticalLines: true
            }
        }
    };

    /* Get the graph ready */
    var vis = new envision.Visualization();
    var detail = new envision.Component(detailOptions);
    var summary = new envision.Component(summaryOptions);
    var interaction = new envision.Interaction();
    var connection = new envision.Component({name: 'ampweb-latency-connection', adapterConstructor: envision.components.QuadraticDrawing});

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
