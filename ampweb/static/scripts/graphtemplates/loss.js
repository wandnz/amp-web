function Loss (object) {


    var summarydata = object.summarydata;
    var detaildata = object.detaildata;
    var container = object.container;

    //Configure the detailed graph
    var detailOptions = {
        name: 'detail',
        data: summarydata,
        height: 300,
        //Flotr config
        config: {
            yaxis: {
                min: 0
            }
        }
    };

    //Configure the summary graph
    var summaryOptions = {
        name: 'summary',
        data: detaildata,
        height: 50,
        //Flotr config
        config: {
            selection: {
                mode: 'x'
            }
        }
    };

    //Get the graph ready
    var vis = new envision.Visualization();
    var detail = new envision.Component(detailOptions);
    var summary = new envision.Component(summaryOptions);
    var interaction = new envision.Interaction();
    var connection = new envision.Component({name: 'ampweb-latency-connection', adapterConstructor: envision.components.QuadraticDrawing});

    //Render Graph
    vis.add(detail);
    vis.add(summary);
    vis.add(connection);
    vis.render(container);
                                        
    //Wireup the interaction
    interaction.leader(summary);
    interaction.follower(detail);
    interaction.follower(connection);
    interaction.add(envision.actions.selection);
}
