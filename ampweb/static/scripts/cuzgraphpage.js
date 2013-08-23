var oneday = (60 * 60 * 24);

function CuzGraphPage() {

    this.stream = ""
    this.sumscale = ""
    this.endtime = Math.round((new Date()).getTime() / 1000);
    this.starttime = this.endtime - (oneday * 2);
    this.generalstart = "";
    this.generalend = "";
    this.tabrequest = undefined;
    this.dropdowns = undefined;
    this.colname = "";
    this.graph = undefined;

    /* Feel free to override this if you want a slightly different URL
     * structure for a particular graph style. Make sure you override
     * updatePageURL too, though! */
    this.decomposeURL = function(urlparts) {
        for (var i = 0; i <= 4; i++) {
            urlparts.push("");
        }

        //this.colname = urlparts[0]

        this.stream = urlparts[1]
        if (urlparts[2] == "") {
            this.sumscale = 30;
        } else {
            this.sumscale = urlparts[2];
        }

        var now = Math.round((new Date()).getTime() / 1000);

        if (urlparts[3] == "") {
            this.starttime = now - (oneday * 2);
        } else {
            this.starttime = parseInt(urlparts[3]);
        }

        if (urlparts[4] == "") {
            this.endtime = now;
        } else {
            this.endtime = parseInt(urlparts[4]);
        }

        this.updateSummaryRange();
    }

    this.updateSummaryRange = function() {
        
        var changeScale = false;
        var now = Math.round((new Date()).getTime() / 1000);
        var selrange = (this.endtime - this.starttime);
        
        /* Usual case, display one month of data */
        var days = 30;
        var sumrange = oneday * days;

        if (selrange > 0.75 * oneday * days) {
            /* Start at 3 months and keep doubling until we find a 
             * summary range that covers our selection nicely */   
            days = 90;
            while (selrange > 0.75 * oneday * days) {
                days *= 2;
                /* A bit of fudging so we can line up with the year
                 * boundary (not accounting for leap years!) */
                if (days == 360)
                    days = 365;
            }
            sumrange = oneday * days
        }
        
        var sumstart = this.starttime;
        var sumend = this.starttime + sumrange;
    
        if (sumend > now) {
            sumstart = now - sumrange;
            sumend = now;
        }
    
        if (days != this.sumscale) 
            changeScale = true;
     
        this.sumscale = days; 
        this.generalend = sumend;
        this.generalstart = sumstart;
        return changeScale;

    }

    this.getCurrentStream = function() {
        return this.stream;
    }

    this.getCurrentSelection = function() {
        var obj = {
            specificstart: this.starttime,
            specificend: this.endtime,
            scale: this.sumscale,
            generalstart: this.generalstart,
            generalend: this.generalend
        };
        return obj;
    }

    this.updatePageURL = function(changedGraph) {
        var base = $(location).attr('href').toString().split("graph")[0] + 
                "graph/";

        var newurl = base + this.colname + "/" + this.stream + "/";
        
        /* XXX I'm so sorry for this code */
        if (this.sumscale != "") {
            newurl += this.sumscale + "/";
            if (this.starttime != "") {
                newurl += this.starttime + "/";

                if (this.endtime != "") {
                    newurl += this.endtime + "/";
                }
            }
        }

        /* If this function has been called as a result of the graph showing a
         * different stream (e.g. the user has selected a new stream via the
         * dropdowns), we need to push a new History entry and generate a new
         * title.
         */
        if (changedGraph) {
            History.pushState(null, "CUZ - Loading", newurl);
            this.updateTitle();
        } else {
            /* Otherwise, just replace the existing URL with the new one */
            History.replaceState(History.getState().data, 
                    History.getState().title, newurl);
        }

    }

    this.changeStream = function(newstream) {
        if (newstream != undefined)
            this.stream = newstream;
    
        $("#graph").empty();

        /* If stream is not set or is invalid, clear the graph and exit */
        if (this.stream == "" || this.stream == "-1") {
            if (this.stream == "-1") {
                $("#graph").append("<p>Invalid stream selected.</p>");
            }
            return;
        }

        $("#graph").append("<p>Loading graph...</p>");

        this.drawGraph();
        this.populateTabs();
    }

    this.populateTabs = function() {
        $('#graphtablist').children().remove();

        if (this.stream == "" || this.stream == "-1")
            return;

        if (this.tabrequest)
            this.tabrequest.abort();

        var graphobj = this;
        /* Get a suitable set of tabs via an ajax query */
        this.tabrequest = $.ajax({
            url: API_URL + "/_relatedstreams/" + graphobj.colname + "/" + 
                    graphobj.stream + "/",
            success: function(data) {
                $.each(data, function(index, obj) {
                    var tabid = "graphtab" + obj['streamid'];
                    var sparkid = "minigraph" + obj['streamid'];
                    var li = "<li id=\"" + tabid + "\" ";
                    
                    li += "onclick=\"changeGraph({graph: '";
                    li += obj['collection'];
                    li += "', stream: '";
                    li += obj['streamid'] + "'})\" ";

                    if (obj['streamid'] == graphobj.stream)
                        li += "class=\"selectedicon\">";
                    else
                        li += "class=\"icon\">";
                    li += "<span id=\"" + sparkid + "\"></span>";
                    li += "<br>" + obj['title'] + "</li>"
                    $('#graphtablist').append(li);
                });
            }
        });
    }

    this.updateSelection = function(newtimes) {
        if (newtimes.specificstart != undefined)
            this.starttime = newtimes.specificstart;
        if (newtimes.specificend != undefined)
            this.endtime = newtimes.specificend;
        if (newtimes.scale != undefined)
            this.sumscale = newtimes.scale;
   
        if (this.updateSummaryRange() == true) {
            /* Summary range has changed -- redraw the summary graph */
            if (this.graph == undefined || this.graph == null)
                return;
            this.graph.updateSummaryGraph(this.generalstart, this.generalend);
        }
    }

    this.setTitle = function(graphtitle) {
        
        /* Despite appearances, the title argument of 
         * History.replaceState isn't guaranteed to have any effect on 
         * the current page title so we have to explicitly set the 
         * page title */
        document.getElementsByTagName('title')[0].innerHTML=graphtitle;

        /* Change the current entry in the History to match new title */
        History.replaceState(History.getState().data, graphtitle,
                History.getState().url);
    }

    this.updateTitle = function() {
        if (this.stream == -1 || this.stream == "" || this.stream == undefined)
        {
            this.setTitle("CUZ - Graphs");
            return;
        }
       
        graphobj = this;
        $.ajax({
            url: API_URL + "/_streaminfo/" + graphobj.colname + "/" + 
                    graphobj.stream + "/",
            success: function(data) {
                var graphtitle = "CUZ - " + data["name"];
                graphobj.setTitle(graphtitle);
            }
        });

    }

    this.setDropdownState = function(state) {
        if (this.dropdowns == undefined || state == undefined)
            return;
        this.dropdowns.setDropdownState(state);
    }

    this.getDropdownState = function() {
        this.dropdowns.getSelected();
        return this.dropdowns.getDropdownState();
    }

    this.dropdownCallback = function(selection) {
        if (this.dropdowns)
            this.dropdowns.callback(selection);
    }

    this.placeDropdowns = function(selectedstream) {
        if (selectedstream == undefined)
            selectedstream = this.stream;
        
        graphobj = this;
        $('#dropdowndiv').empty();

        this.initDropdowns(selectedstream);

        $.ajax({
            url: API_URL + "/_selectables/" + graphobj.colname + "/" +
                    selectedstream + "/",
            success: function(data) {
                $.each(data, function(index, obj) {
                    graphobj.dropdowns.constructDropdown(obj);
                });

                /* XXX Doing this here isn't ideal, but we have to wait until
                 * the AJAX call populates our dropdowns with their initial
                 * settings before we can record the dropdown history for the
                 * first stream */
                saveDropdownState();
            }
        });
    }
}

CuzGraphPage.prototype.initDropdowns = function() {};
CuzGraphPage.prototype.drawGraph = function() {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
