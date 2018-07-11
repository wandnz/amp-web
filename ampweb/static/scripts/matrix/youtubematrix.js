/*
 * This file is part of amp-web.
 *
 * Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
 *
 * Authors: Shane Alcock
 *          Brendon Jones
 *
 * All rights reserved.
 *
 * This code has been developed by the WAND Network Research Group at the
 * University of Waikato. For further information please see
 * http://www.wand.net.nz/
 *
 * amp-web is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * amp-web is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with amp-web; if not, write to the Free Software Foundation, Inc.
 * 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Please report any bugs, questions or comments to contact@wand.net.nz
 */


function YoutubeMatrix() {

    BaseMatrix.call(this);
    this.graphstyle = "amp-youtube";
    this.defaultmetric = "initial_buffering";
    this.statecookieid = "ampwebMatrixYoutubeState";
    this.displayname = "YouTube Video Fetch Time";

    this.metricData = [
        { 'text': 'Time Before Buffering', 'value': 'pre_time' },
        { 'text': 'Initial Buffering', 'value': 'initial_buffering' },
        { 'text': 'Stall Count', 'value': 'stall_count' },
        { 'text': 'Stall Time', 'value': 'stall_time' },
    ];

    this.splitData = [
        { 'text': 'System Preference', 'value': 'combined',
                'shortlabel': 'No matter'}
    ];

}

YoutubeMatrix.prototype = new BaseMatrix();
YoutubeMatrix.prototype.constructor = YoutubeMatrix;

YoutubeMatrix.prototype.getLegendItems = function(params) {

    if ( params.absrel == "absolute" ) {
        switch ( params.metric ) {
            case "pre_time":
                return [
                    {'colour': 'test-colour1', 'label':"Time 0.0 to 0.01 sec"},
                    {'colour': 'test-colour2', 'label':"Time 0.01 to 0.02 sec"},
                    {'colour': 'test-colour3', 'label':"Time 0.02 to 0.05 sec"},
                    {'colour': 'test-colour4', 'label':"Time 0.05 to 0.1 sec"},
                    {'colour': 'test-colour5', 'label':"Time 0.1 to 0.2 sec"},
                    {'colour': 'test-colour6', 'label':"Time 0.2 to 0.5 sec"},
                    {'colour': 'test-colour7', 'label':"Time > 0.5 sec"},
                ];
                break;

            case "initial_buffering":
            case "stall_time":
                return [
                    {'colour': 'test-colour1', 'label':"Time 0.0 to 0.5 sec"},
                    {'colour': 'test-colour2', 'label':"Time 0.5 to 1.0 sec"},
                    {'colour': 'test-colour3', 'label':"Time 1.0 to 2.5 sec"},
                    {'colour': 'test-colour4', 'label':"Time 2.5 to 5.0 sec"},
                    {'colour': 'test-colour5', 'label':"Time 5.0 to 7.5 sec"},
                    {'colour': 'test-colour6', 'label':"Time 7.5 to 10 sec"},
                    {'colour': 'test-colour7', 'label':"Time > 10 sec"},
                ];
                break;

            case "stall_count":
                return [
                    {'colour': 'test-colour1', 'label':"Did not stall"},
                    {'colour': 'test-colour2', 'label':"Stalled once"},
                    {'colour': 'test-colour3', 'label':"Stalled twice"},
                    {'colour': 'test-colour4', 'label':"Stalled 3 times"},
                    {'colour': 'test-colour5', 'label':"Stalled 4 times"},
                    {'colour': 'test-colour6', 'label':"Stalled 5 times"},
                    {'colour': 'test-colour7', 'label':"Stalled > 5 times"},
                ];
                break;
        };
    } else if (params.absrel == "relative") {
        return [
            {'colour': 'test-colour1', 'label':"Below or at mean"},
            {'colour': 'test-colour2', 'label':"0 - 0.5 standard deviations"},
            {'colour': 'test-colour3', 'label':"0.5 - 1.0 standard deviations"},
            {'colour': 'test-colour4', 'label':"1.0 - 1.5 standard deviations"},
            {'colour': 'test-colour5', 'label':"1.5 - 2.0 standard deviations"},
            {'colour': 'test-colour6', 'label':"2.0 - 3.0 standard deviations"},
            {'colour': 'test-colour7', 'label':"> 3.0 standard deviations"},
        ];
    }
}

YoutubeMatrix.prototype.getGraphStyle = function(params) {
    return "amp-youtube";
}

YoutubeMatrix.prototype.getDisplayName = function(name) {
    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

YoutubeMatrix.prototype.getLegendTitle = function(params) {
    if ( params.absrel == "absolute" ) {
        if (params.metric == "pre_time" ) {
            return "Preparing to Download Time";
        } else if (params.metric == "initial_buffering" ) {
            return "Initial Buffering Time";
        } else if (params.metric == "stall_time" ) {
            return "Stalling Time";
        } else if (params.metric == "stall_count" ) {
            return "Stall Count";
        }
    } else if (params.absrel == "relative") {
        return "Increase relative to daily mean";
    }

    return "Legend";
}

YoutubeMatrix.prototype.deconstructURL = function() {

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
        'metric': (segments[index + 5] || this.defaultmetric),
        'absrel': (segments[index + 6] || 'absolute'),
    };
}

YoutubeMatrix.prototype.constructURL = function(params, current, base) {
    var url = base;
    var laststate = this.loadTabState();

    if (current.split != 'combined') {
        if (laststate.split)
            current.split = laststate.split;
        else
            current.split = 'combined';
    }

    if (current.metric != this.defaultmetric) {
        if ( laststate.metric ) {
            current.metric = laststate.metric
        } else {
            current.metric = this.defaultmetric
        }
    }

    url += (params.test || current.test) + '/';
    url += (params.split || current.split) + '/';
    /* don't save a url in the cookie with broken, undefined source mesh */
    if ( params.source == undefined && current.source == undefined ) {
        return url;
    }
    url += (params.source || current.source) + '/';
    /* don't save a url in the cookie with broken, undefined dest mesh */
    if ( params.destination == undefined && current.destination == undefined ){
        return url;
    }
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';
    url += (params.absrel || current.absrel) + '/';

    return url;
}

YoutubeMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (!'test' in parts || parts['test'] != 'youtube') {
        return false;
    }

    if (!'split' in parts || parts['split'] != 'combined') {
        return false;
    }

    if (!'metric' in parts ||
            (parts['metric'] != 'pre_time' &&
             parts['metric'] != 'initial_buffering' &&
             parts['metric'] != 'stall_time' &&
             parts['metric'] != 'stall_count')) {
        return false;
    }

    if (!'absrel' in parts ||
            (parts['absrel'] != 'absolute' && parts['absrel'] != 'relative')) {
        return false;
    }

    return true;
}

YoutubeMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var index = {
        "pre_time": 1,
        "initial_buffering": 4,
        "stall_time": 7,
        "stall_count": 10,
    };

    /* it's an error if we don't know about the metric */
    if ( !(params.metric in index) ) {
        return ['test-error'];
    }

    var offset = index[params.metric];
    var value = cellData['ipv4'][offset];
    var value_day = cellData['ipv4'][offset + 1];
    var value_day_sd = cellData['ipv4'][offset + 2];

    /* undefined values means the test is not performed */
    if ( value == undefined ) {
        return ['test-none'];
    }

    if ( value < 0 ) {
        return ['test-error'];
    }

    if ( params.absrel == "absolute" ) {
        if ( params.metric == "pre_time" ) {
            return [getCellColour(value, [
                    value < 0.01, value < 0.02, value < 0.05,
                    value < 0.1, value < 0.2, value < 0.5
            ])];
        }

        if ( params.metric == "initial_buffering" ||
                params.metric == "stall_time" ) {
            return [getCellColour(value, [
                    value < 0.5, value < 1.0, value < 2.5,
                    value < 5.0, value < 7.5, value < 10.0
            ])];
        }

        if ( params.metric == "stall_count" ) {
            return [getCellColour(value, [
                    value < 1, value < 2, value < 3,
                    value < 4, value < 5, value < 6
            ])];
        }

    } else {
        return [getCellColour(value, [
                value <= value_day || value_day_sd < 0,
                value <= value_day * (value_day_sd * 0.5),
                value <= value_day * (value_day_sd),
                value <= value_day * (value_day_sd * 1.5),
                value <= value_day * (value_day_sd * 2),
                value <= value_day * (value_day_sd * 3),
        ])];
    }

    return ['test-error'];
}

YoutubeMatrix.prototype.getSparklineColour = function(series) {
    return "blue";
}

YoutubeMatrix.prototype.formatTooltipStats = function(stats, content, split,
        metric) {
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    if (metric == "pre_time") {
        thead = $('<thead/>').appendTo(table).append(
            '<tr><th>Time Period</th>' +
            '<th class="firsthalf">Mean Time Before Buffering</th>');
    } else if (metric == "initial_buffering") {
        thead = $('<thead/>').appendTo(table).append(
            '<tr><th>Time Period</th>' +
            '<th class="firsthalf">Mean Initial Buffering Time</th>');
    } else if (metric == "stall_time") {
        thead = $('<thead/>').appendTo(table).append(
            '<tr><th>Time Period</th>' +
            '<th class="firsthalf">Mean Total Stall Time</th>');
    } else if (metric == "stall_count") {
        thead = $('<thead/>').appendTo(table).append(
            '<tr><th>Time Period</th>' +
            '<th class="firsthalf">Mean Stall Count</th>');
    } else {
        thead = $('<thead/>').appendTo(table).append(
            '<tr><th>Time Period</th>' +
            '<th class="firsthalf">Measurement</th>');
    }

    tbody = $('<tbody/>').appendTo(table);

    for ( var i = 0; i < stats.length; i++ ) {
        $('<tr/>').appendTo(tbody)
            .append('<td>' + stats[i].label + '</td>')
            .append('<td>' + stats[i].value + '</td>');
    }

    return table;
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
