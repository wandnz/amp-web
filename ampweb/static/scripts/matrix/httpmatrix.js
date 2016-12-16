function HttpMatrix() {

    BaseMatrix.call(this);
    this.graphstyle = "amp-http";
    this.defaultmetric = "duration";
    this.statecookieid = "ampwebMatrixHttpState";
    this.displayname = "HTTP Page Fetch Time";

    this.metricData = [
        { 'text': 'Duration', 'value': 'duration' },
        { 'text': 'Page Size', 'value': 'pagesize' },
    ];

    this.splitData = [
        { 'text': 'System Preference', 'value': 'combined',
                'shortlabel': 'No matter'}
    ];

}

HttpMatrix.prototype = new BaseMatrix();
HttpMatrix.prototype.constructor = HttpMatrix;

HttpMatrix.prototype.getLegendItems = function(params) {

    if (params.metric == "duration" && params.absrel == "absolute") {
        return [
            {'colour': 'test-colour1', 'label':"Fetch Time 0.0 to 0.5 sec"},
            {'colour': 'test-colour2', 'label':"Fetch Time 0.5 to 1.0 sec"},
            {'colour': 'test-colour3', 'label':"Fetch Time 1.0 to 2.5 sec"},
            {'colour': 'test-colour4', 'label':"Fetch Time 2.5 to 5.0 sec"},
            {'colour': 'test-colour5', 'label':"Fetch Time 5.0 to 7.5 sec"},
            {'colour': 'test-colour6', 'label':"Fetch Time 7.5 to 10 sec"},
            {'colour': 'test-colour7', 'label':"Fetch Time > 10 sec"},
        ];
    } else if (params.metric == "duration" && params.absrel == "relative") {
        return [
            {'colour': 'test-colour1', 'label':"Below or at mean"},
            {'colour': 'test-colour2', 'label':"0 - 0.5 standard deviations"},
            {'colour': 'test-colour3', 'label':"0.5 - 1.0 standard deviations"},
            {'colour': 'test-colour4', 'label':"1.0 - 1.5 standard deviations"},
            {'colour': 'test-colour5', 'label':"1.5 - 2.0 standard deviations"},
            {'colour': 'test-colour6', 'label':"2.0 - 3.0 standard deviations"},
            {'colour': 'test-colour7', 'label':"> 3.0 standard deviations"},
        ];
    } else if (params.metric == "pagesize" && params.absrel == "absolute") {
        return [
            {'colour': 'test-colour1', 'label':"Page Size < 100 KB"},
            {'colour': 'test-colour2', 'label':"Page Size 100 to 250 KB"},
            {'colour': 'test-colour3', 'label':"Page Size 250 to 500 KB"},
            {'colour': 'test-colour4', 'label':"Page Size 500 to 750 KB"},
            {'colour': 'test-colour5', 'label':"Page Size 750 to 1000 KB"},
            {'colour': 'test-colour6', 'label':"Page Size 1000 to 2000 KB"},
            {'colour': 'test-colour7', 'label':"Page Size >= 2000 KB"},
        ];

    } else if (params.metric == "pagesize" && params.absrel == "relative") {
        return [
            {'colour': 'test-colour1', 'label':" < 5% of maximum size"},
            {'colour': 'test-colour2', 'label':"5 - 10% of maximum size"},
            {'colour': 'test-colour3', 'label':"10 - 15% of maximum size"},
            {'colour': 'test-colour4', 'label':"15 - 20% of maximum size"},
            {'colour': 'test-colour5', 'label':"20 - 25% of maximum size"},
            {'colour': 'test-colour6', 'label':"25 - 40% of maximum size"},
            {'colour': 'test-colour7', 'label':"> 40% of maximum size"},
        ];
    }


}

HttpMatrix.prototype.getGraphStyle = function(params) {
    if (params.metric == "pagesize") {
        return "amp-httppagesize";
    }
    return "amp-http";
}

HttpMatrix.prototype.getDisplayName = function(name) {

    if (name.search("http://") == 0 || name.search("https://") == 0) {
        return name.replace(/^(https?:\/\/)([^\/]+).*$/, '$2');
    }
    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

HttpMatrix.prototype.getLegendTitle = function(params) {

    if (params.metric == "duration" && params.absrel == "absolute") {
        return "Page Fetch Time";
    } else if (params.metric == "duration" && params.absrel == "relative") {
        return "Increase relative to daily mean";
    } else if (params.metric == "pagesize" && params.absrel == "absolute") {
        return "Page Size";
    } else if (params.metric == "pagesize" && params.absrel == "relative") {
        return "Variation relative to daily maximum";
    }

    return "Legend";
}

HttpMatrix.prototype.deconstructURL = function() {

    var segments = getURI().segment();
    var index = segments.indexOf("matrix");

    for (var i = segments.length; i <= 6; i++) {
        segments.push(null);
    }

    return {
        'prefix': (index == 0 ? "" : segments.slice(0, index).join("/") + "/"),
        'test': (segments[index + 1] || 'http'),
        'split': (segments[index + 2] || 'combined'),
        'source': (segments[index + 3] || undefined),
        'destination': (segments[index + 4] || undefined),
        'metric': (segments[index + 5] || 'duration'),
        'absrel': (segments[index + 6] || 'absolute'),
    };


}

HttpMatrix.prototype.constructURL = function(params, current, base) {

    var url = base;
    var laststate = this.loadTabState();

    if (current.split != 'combined') {
        if (laststate.split)
            current.split = laststate.split;
        else
            current.split = 'combined';
    }

    if (current.metric != 'duration') {
        if (laststate.metric)
            current.metric = laststate.metric
        else
            current.metric = "duration";
    }

    url += (params.test || current.test) + '/';
    url += (params.split || current.split) + '/';
    url += (params.source || current.source) + '/';
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';
    url += (params.absrel || current.absrel) + '/';


    return url;


}

HttpMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (parts.length != 5)
        return false;

    if (parts[0] != 'http')
        return false;

    if (parts[1] != 'combined')
        return false;

    if (parts[4] != 'duration')
        return false;

    return true;
}

HttpMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var duration = cellData['ipv4'][1];
    var duration_day = cellData['ipv4'][2];
    var duration_day_sd = cellData['ipv4'][3];
    var pagesize = cellData['ipv4'][4];
    var pagesize_day = cellData['ipv4'][5];
    var pagesize_day_sd = cellData['ipv4'][6];

    if (params.metric == "duration") {

        if (duration == undefined) {
            return ['test-none'];
        }

        if (duration < 0)
            return ['test-error'];

        if (params.absrel == "absolute") {

            return [getCellColour(duration, [
                duration < 0.5, duration < 1.0, duration < 2.5,
                duration < 5.0, duration < 7.5, duration < 10.0
            ])];
        } else {
            return [getCellColour(duration, [
                duration <= duration_day || duration_day_sd < 0,
                duration <= duration_day * (duration_day_sd * 0.5),
                duration <= duration_day * (duration_day_sd),
                duration <= duration_day * (duration_day_sd * 1.5),
                duration <= duration_day * (duration_day_sd * 2),
                duration <= duration_day * (duration_day_sd * 3),
            ])];

        }

    } else if (params.metric == "pagesize") {

        if (pagesize == undefined) {
            return ['test-none'];
        }

        if (pagesize < 0)
            return ['test-error'];

        if (params.absrel == "absolute") {

            return [getCellColour(pagesize, [
                pagesize < 100, pagesize < 250, pagesize < 500,
                pagesize < 750, pagesize < 1000, pagesize < 2000
            ])];
        } else {
            return [getCellColour(pagesize, [
                pagesize_day_sd <= pagesize_day * 0.05,
                pagesize_day_sd <= pagesize_day * 0.1,
                pagesize_day_sd <= pagesize_day * 0.15,
                pagesize_day_sd <= pagesize_day * 0.20,
                pagesize_day_sd <= pagesize_day * 0.25,
                pagesize_day_sd <= pagesize_day * 0.40,
            ])];

        }


    }

    return ['test-error'];

}

HttpMatrix.prototype.getSparklineColour = function(series) {
    return "blue";
}

HttpMatrix.prototype.formatTooltipStats = function(stats, content) {
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    thead = $('<thead/>').appendTo(table).append(
        '<tr><th>Time period</th>' + '<th class="firsthalf">Fetch Time</th>');

    tbody = $('<tbody/>').appendTo(table);

    for ( var i = 0; i < stats.length; i++ ) {
        var values = stats[i].value.split('/');

        $('<tr/>').appendTo(tbody)
            .append('<td>' + stats[i].label + '</td>')
            .append('<td>' + values[0] + '</td>');

    }

    return table;



}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

