var oneday = (60 * 60 * 24);

function NNTSCGraph() {

    this.stream = ""
    this.sumscale = ""
    this.endtime = Math.round((new Date()).getTime() / 1000);
    this.starttime = this.endtime - (oneday * 2);
    this.generalstart = "";
    this.generalend = "";
    this.request = undefined;
    this.dropdowns = undefined;
    this.colname = "";

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
        var now = Math.round((new Date()).getTime() / 1000);
        var range = (Math.floor((this.endtime - this.starttime) / 
                    (oneday * this.sumscale)) + 1);
        range = range * this.sumscale * oneday;
        this.generalend = now;
        this.generalstart = this.generalend - range;

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

        /* Abort any outstanding requests */
        if (this.request)
            this.request.abort();
        
        $("#graph").append("<p>Loading graph...</p>");

        this.drawGraph();
        this.addZoomControl("zoom-out2", 80, 540, false);
        this.addZoomControl("zoom-in2", 890, 540, true);

    }

    this.generateSummaryXTics = function() {
        var ticlabels = [];
        var startdate = new Date(this.generalstart * 1000.0);
        var enddate = new Date(this.generalend * 1000.0);

        startdate.setHours(0);
        startdate.setMinutes(0);
        startdate.setSeconds(0);
        startdate.setMilliseconds(0);

        var days = (this.generalend - this.generalstart) / oneday;
        var dayskip = Math.floor(days / 15);

        if (dayskip == 0)
            dayskip = 1;

        var ticdate = startdate;
        var nextlabel = startdate;

        while (ticdate.getTime() <= enddate.getTime()) {

            var xtic = ticdate.getTime();
            var parts = ticdate.toDateString().split(" ");

            if (ticdate.getTime() == nextlabel.getTime()) {
                ticlabels.push([xtic, parts[1] + " " + parts[2]]);
                nextlabel = new Date(ticdate.getTime() + (dayskip * oneday * 1000));
            }
            else {
                /* Limit the number of ticks once we start looking at lots of
                 * data, it gets cluttered.
                 */
                if ( days < 60 ) {
                    ticlabels.push([xtic, ""]);
                }
            }

            ticdate = new Date(ticdate.getTime() + (oneday * 1000));

            /* Jumping ahead a fixed number of hours is fine, right up until 
             * you hit a daylight savings change and now you are no longer 
             * aligned to midnight. I don't trust arithmetic on the hours 
             * field, so I'm going to just make sure I'm in the right day and 
             * set hours back to zero.
             */
            if (ticdate.getHours() != 0) {
                if (ticdate.getHours() < 12) {
                    /* Round down */
                    ticdate.setHours(0);
                } else {
                    /* Round up */
                    ticdate = new Date(ticdate.getTime() + (oneday * 1000));
                    ticdate.setHours(0);
                }
            }

            if (nextlabel.getHours() != 0) {
                if (nextlabel.getHours() < 12) {
                    /* Round down */
                    nextlabel.setHours(0);
                } else {
                    /* Round up */
                    nextlabel = new Date(nextlabel.getTime() + (oneday * 1000));
                    nextlabel.setHours(0);
                }
            }
        }
        return ticlabels;
    }

    this.addZoomControl = function(image, leftoffset, topoffset, zoom) {
        var button =
            $('<img class="zoombutton" src="' + STATIC_URL + '/img/' +
                    image + '.png" ' + 'style="left:' + leftoffset + 
                    'px; top:' + topoffset + 'px;' +
                    ' position:absolute; z-index:10; cursor:pointer;' +
                    ' opacity:0.6;">');

        button.click(function(e) {e.preventDefault(); updateZoomLevel(zoom);});
        button.appendTo($("#graph"));
    }

    this.updateZoomLevel = function(zoom) {
        var scale = parseInt(this.sumscale);
        var diff;
        if ( zoom ) {
            if ( scale > 30 ) {
                /* adjust by about a month if we are looking at a lot of data */
                diff = -30;
            } else if ( scale > 10 ) {
                /* adjust by 10 days if we are only looking at a bit of data*/
                diff = -10;
            } else {
                /* don't do anything if we are really zoomed in already */
                return;
            }
            /*
             * Make sure that the selection box doesn't fall off the left hand
             * side of the graph if we are zooming in. If it would, don't zoom.
             */
            if ( this.starttime < this.generalstart + 
                    ((scale + diff) * oneday) ) {
                return;
            }
        } else {
            if ( scale < 30 ) {
                /* adjust by 10 days if we are only looking at a bit of data*/
                diff = 10;
            } else {
                /* adjust by about a month if we are looking at a lot of data */
                diff = 30;
            }
        }

        /* adjust the scale to match the new zoom level */
        this.sumscale = scale + diff;

        /* update url with new scale value, refresh/redraw everything etc */
        this.updatePageURL(false);
        this.updateSummaryRange();
        this.changeStream(this.stream);

    }

    this.updateSelection = function(newtimes) {
        if (newtimes.specificstart != undefined)
            this.starttime = newtimes.specificstart;
        if (newtimes.specificend != undefined)
            this.endtime = newtimes.specificend;
        if (newtimes.scale != undefined)
            this.sumscale = newtimes.scale;
        if (newtimes.generalstart != undefined)
            this.generalstart = newtimes.generalstart;
        if (newtimes.generalend != undefined)
            this.generalend = newtimes.generalend;
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
        return this.dropdowns.getDropdownState();
    }

    this.dropdownCallback = function(selection) {
        if (this.dropdowns)
            this.dropdowns.callback(selection);
    }
}

NNTSCGraph.prototype.initDropdowns = function() {};
NNTSCGraph.prototype.drawGraph = function() {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
