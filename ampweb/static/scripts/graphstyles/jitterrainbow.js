function JitterPercentileGraph(params) {

    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "jitterrainbow";

    this.configureStyle = function() {
        var detopts = this.detailgraph.options,
            sumopts = this.summarygraph.options;

        detopts.config.jitterrainbow = jQuery.extend(true, {}, CuzJitterRainbowConfig);
        sumopts.config.jitterrainbow = jQuery.extend(true, {}, CuzJitterRainbowConfig);

    }

    this.formDataURL = function() {
        var url = this.dataurl + "jitter/" + this.lines[0].id;
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;
        return url;
    }

    this.formSummaryURL = function() {
        var url = this.dataurl + "jitter-summary/" + this.lines[0].id;
        url += "/" + this.summarygraph.start + "/" + this.summarygraph.end;
        return url;
    }

    this.__processSummaryData = this.processSummaryData;
    this.__processDetailedData = this.processDetailedData;

    this.findMaximumY = function(data, start, end) {
        return this._findMaximumYByIndex(data, start, end, 11);

    }

    this.findMinimumY = function(data, start, end) {
        var min = this._findMinimumYByIndex(data, start, end, 1);
        var min10 = this._findMinimumYByIndex(data, start, end, 2);

        if (min < min10)
            return min;
        return min10;

    }

    this.displayTooltip = function(o) {
        if (o.nearest.event)
            return this.displayEventTooltip(o);
        
        var block = o.nearest.block; 
        var ttip = "";
        var tsstr = simpleDateString(parseInt(block[0]));

        ttip += tsstr + "<br /><hr><table><tr><td>";

        ttip += ((block[4] + 1) * 10) + "th percentile</td>";
        ttip += "<td>" + this.usecRound(block[2], 1) + " " + this.units;
        ttip += "</td></tr><td>";
        ttip += (block[4] * 10) + "th percentile</td>";
        ttip += "<td>" + this.usecRound(block[1], 1) + " " + this.units;
        ttip += "</td></tr>";
        ttip += "</table>";

        return ttip;

    }

    this.usecRound = function (number, decimals) {
        return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
    }

}


JitterPercentileGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
JitterPercentileGraph.prototype.constructor = JitterPercentileGraph;
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
