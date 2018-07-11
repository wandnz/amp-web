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

/* Various utility functions that might be used in multiple places */

/* Place to store global variables */
var globalVars = {unloaded:false, lasterrormsg: ""};

function getURI() {
    var base = History.getState()
            ? History.getState().url
            : window.document.location.href;

    var uri = new URI(base);

    if ( uri.fragment() ) {
        var fragment = new URI(uri.fragment());
        uri = fragment.absoluteTo(uri);
    }

    return uri;
}

$(document).ready(function() {
    var History = window.History;

    var segments = getURI().segment();
    segments.push(null); // length at least 1
    /* advance to just the part that is relevant */
    segments = segments.slice(segments.indexOf(ROUTE));

    $('#page > nav > ul > li#tab-' + (segments[0] || 'browser'))
            .addClass('current');

    $(window).bind('beforeunload', function(){
            globalVars.unloaded = true;
    });
});

function setPageTitle(newTitle) {
    document.title = "WAND - " + newTitle;
    try {
        $('title')[0].innerHTML = document.title
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;')
                .replace(/ & /g,' &amp; ');
    } catch ( Exception ) { }
}

/* Helper function for dealing with inheritance where the parent class
 * constructor requires arguments as setting the prototype for the child
 * normally requires calling the parent constructor. If we don't have
 * suitable arguments, this can cause errors.
 *
 * This function simply temporarily replaces the parent constructor with
 * a dummy constructor that takes no parameters for the purpose of creating
 * inheritance relationships.
 */
function inherit(o) {
    function F() {};
    F.prototype = o;
    return new F();
}

/* Sneaky method for allowing us to ensure that "this" refers to something
 * useful when a timeout callback is fired.
 *
 * Instead of calling window.setTimeout(callback, timeout), call
 * window.setTimeout.call(this, callback, timeout)
 */
var __nativeST__ = window.setTimeout;

window.setTimeout = function(vCallback, nDelay) {
    var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
    return __nativeST__(vCallback instanceof Function ? function () {
        vCallback.apply(oThis, aArgs);
    } : vCallback, nDelay);
};

function isMouseHitOnSeries(data, mouse, options) {
    var mouseX = mouse.relX,
        mouseY = mouse.relY;

    var result = {x: 0, y: 0, isHit: false};
    var dataindex = options.data.dataindex;
    var mindist = 0;
    var lastx = 0;
    var lasty = 0;
    var lastts = 0;

    if (dataindex == undefined)
        dataindex = 1;

    for ( var i = 0; i < data.length - 1; ++i ) {
        if ( data[i][dataindex] === null || data[i+1][dataindex] === null ) {
            continue;
        }

        if (data[i].length < 2)
            continue;

        var x1 = options.xScale(data[i][0]);
        var val = data[i][dataindex];
        var x2 = options.xScale(data[i+1][0]);
        var nextval = data[i+1][dataindex];
        var y1 = options.yScale(val);
        var y2 = options.yScale(nextval);

        if (
            (y1 > options.height && y2 > options.height) ||
            (y1 < 0 && y2 < 0) ||
            (x1 < 0 && x2 < 0) ||
            (x1 > options.width && x2 > options.width)
           ) continue;

        if (data[i+1][dataindex] !== null) {
            if (mindist == 0 || data[i+1][dataindex] - data[i][dataindex] <
                        mindist)
                mindist = data[i+1][0] - data[i][0];

            lastx = x2;
            lastts = data[i+1][0];
            lasty = y2;
        }

        /* Look for a hit on a horizontal line.
         * Make sure we are well between x1 and x2 and within 5 units of
         * the Y value.
         */
        if ( mouseX + 2 > x1 && mouseX - 2 < x2 &&
                    Math.round(mouseY) > Math.round(y1) - 5 &&
                    Math.round(mouseY) < Math.round(y1) + 5 ) {

            /*
            if (Math.abs(x1 - mouseX) < Math.abs(x2 - mouseX))
                result.x = options.xInverse(x1);
            else
                result.x = options.xInverse(x2);
            */
            result.x = options.xInverse(x1);
            result.y = options.yInverse(y1);
            result.isHit = true;
            break;
        }

        /* Look for a hit on a vertical line.
         * Make sure we are bang on either x1 or x2 and somewhere between
         * y1 and y2.
         */
        if ( (mouseX >= x2 - 1 && mouseX <= x2 + 1)) {
            var topy = Math.max(y1, y2);
            var boty = Math.min(y1, y2);

            if (Math.round(mouseY) >= boty - 2 &&
                    Math.round(mouseY) <= topy + 2) {
                result.x = options.xInverse(x2);
                result.y = options.yInverse(y2);
                result.isHit = true;
                break;
            }
        }

    }

    /* Limit hit zone to 150s to match the shortened lines we draw for
     * the last datapoint.
     */
    if (mindist > 150000)
        mindist = 150000;

    var lastx2 = Math.round(options.xScale(lastts + mindist));
    /* Look for a hit on the horizontal line for the last datapoint */
    if (mouseX + 2 > lastx && mouseX - 2 < lastx2 &&
            Math.round(mouseY) > Math.round(lasty) - 5 &&
            Math.round(mouseY) < Math.round(lasty) + 5) {

        result.x = options.xInverse(lastx);
        result.y = options.yInverse(lasty);
        result.isHit = true;
    }


    return result;
}

/* Default colour assignment for graph lines */
function getSeriesHue(seriesid) {
    /* http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/ */
    /*
     * 0.618033988749895 is the golden ratio conjugate that was used when
     * hue was in the range 0-1, I've multiplied it by 360 to fit the range
     * 0-360, is this sensible? What about a Sobol or Halton sequence?
     */

    /*
     * This isn't very nice, but in the absence of making a better colour
     * selection algorithm, swap the first two colours (red/blue) around so
     * that when viewed with ipv4/ipv6 split they match the matrix tooltips.
     * Consistency is good.
     * TODO better colour selection algorithm.
     */
    if ( seriesid == 0 ) {
        seriesid = 1;
    } else if ( seriesid == 1 ) {
        seriesid = 0;
    }
    return (seriesid * 222.49223594996221) % 360;
}

function getSeriesStyle(seriesid) {
    return "hsla(" + getSeriesHue(seriesid) + ", 90%, 50%, 1.0)";
}

function getSeriesSmokeStyle(seriesid) {
    return "hsla(" + getSeriesHue(seriesid) + ", 90%, 50%, 0.1)";
}

/* Count the number of unique lines present in a graph, according to the
 * legend data provided by ampy.
 */
function getSeriesLineCount(legend) {
    var count = 0;
    for ( var group_id in legend ) {
        if ( legend.hasOwnProperty(group_id) ) {
            count += legend[group_id].lines.length;
        }
    }
    return count;

}

/* Function to extract the timezone from a string representation of a date.
 * Every browser seems to express date strings differently, so this becomes
 * a pretty hax function.
 */
function getTZLabel() {

    var tzMins = -(new Date()).getTimezoneOffset();
    var tzHrs = (tzMins === null ? 0 : tzMins) / 60 * 100;

    var gmtStr = 'GMT' + (tzHrs >= 0 ? '+' : '') + tzHrs;

    var tz = jstz.determine();
    gmtStr += ' (' + tz.name() + ')';

    return gmtStr;
}

/* XXX Consider using something like moment.js if we're having to do a lot
 * of date formatting / manipulation.
 *
 * Returns a simple mm dd, HH:MM date string -- note, no seconds or year.
 */
function simpleDateString(ts) {
    var date = new Date(ts);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
            'Sep', 'Oct', 'Nov', 'Dec'];
    var month = months[date.getMonth()];
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes() < 10 ? '0' + date.getMinutes(): date.getMinutes();
    var sec = date.getSeconds() < 10 ? '0' + date.getSeconds(): date.getSeconds();

    return month + ' ' + day + ', ' + hour + ':' + min;
}

/*
function getTZLabel() {
    // This function is balls -- surely there is a better way to get this
    // than this collection of hacks

    var parts = (new Date()).toString().split(" ");
    var datestr = "Unknown Timezone";

    // Firefox, Safari, Chrome
    if (parts.length == 7) {
        datestr = parts[5] + " " + parts[6];
    }

    // IE 10 and Opera
    if (parts.length == 6) {

        // If this regex matches, we're looking at Opera
        if (parts[5].match(/GMT/) != null)
            datestr = parts[5];
        else
            datestr = parts[4];
    }

    // TODO: Older IE?

    return datestr;
}
*/

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
        if ( this === undefined || this === null ) {
            throw new TypeError( '"this" is null or not defined' );
        }

        var length = this.length >>> 0; // Hack to convert object.length to a UInt32

        fromIndex = +fromIndex || 0;

        if (Math.abs(fromIndex) === Infinity) {
            fromIndex = 0;
        }

        if (fromIndex < 0) {
            fromIndex += length;
            if (fromIndex < 0) {
                fromIndex = 0;
            }
        }

        for (;fromIndex < length; fromIndex++) {
            if (this[fromIndex] === searchElement) {
                return fromIndex;
            }
        }

        return -1;
    };
}

if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function(searchElement /*, fromIndex*/) {
        'use strict';

        if (this == null) {
            throw new TypeError();
        }

        var n, k,
            t = Object(this),
            len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }

        n = len;
        if (arguments.length > 1) {
            n = Number(arguments[1]);
            if (n != n) {
                n = 0;
            } else if (n != 0 && n != (1 / 0) && n != -(1 / 0)) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }

        for (k = n >= 0
                ? Math.min(n, len - 1)
                : len - Math.abs(n); k >= 0; k--) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

/*
 * Build a useful error string for an ajax request, combining a custom message
 * and the details from the failed request.
 */
function buildAjaxErrorString(message, textStatus, errorThrown) {
    var errorstr = message;

    if ( textStatus != null ) {
        errorstr += ", " + textStatus;
    }

    if ( errorThrown != null ) {
        errorstr += ": " + errorThrown;
    }

    return errorstr;
}


/*
 * Build and display a bootstrap alert for a failed ajax request.
 */
function displayAjaxAlert(message, textStatus, errorThrown) {
    var msg = buildAjaxErrorString(message, textStatus, errorThrown);

    if (msg != globalVars.lasterrormsg || $("#alerts").children().length == 0) {
        displayAlert(msg);
        globalVars.lasterrormsg = msg;
    }
}


/*
 * Create and display alert messages in a floating, dismissiable bootstrap
 * alert. Currently only displays red "danger" alerts, we don't report less
 * serious errors to the user.
 */
function displayAlert(message) {
    /* generate the alert div */
    var alert = "<div class='alert alert-danger alert-dismissable'>" +
        "<button type='button' class='close' data-dismiss='alert' " +
        "aria-hidden='true'>&times;</button>" + message + "</div>";

    /* append it to the alerting area */
    $("#alerts").append(alert);
}

/*
 * Toggle the visibility of the event group details.
 */
function showEventGroup(id) {
    var group = $("#group_" + id);
    if (group.css('display') == 'none') {
        group.stop().slideDown(200);
    } else {
        group.stop().slideUp(200);
    }
}

/*
 * Replace a select dropdown element with a prettier select2 one
 * Arguments
 *  - selector: the jQuery selector used to select elements to prettify
 *  - opts: optional arguments to pass to select2()
 */
function prettifySelect(selector, opts) {
    if (typeof opts === 'undefined') {
        opts = {};
    }

    /* Default options for select2 */
    var defaultopts = {
        theme: "bootstrap",
        width: "style",
        minimumResultsForSearch: 5
    };

    for (var prop in defaultopts) {
        if (prop in opts) {
            continue;
        }
        opts[prop] = defaultopts[prop];
    }

    /* Remove any options which are undefined,
     * this lets us remove options from defaultopts */
    for (var prop in opts) {
        if (typeof opts[prop] === 'undefined') {
            delete opts[prop];
        }
    }

    selector.each(function(i) {
        if ($(this).data('select2')) {
            /* Destroy old select2 elements if they exist already
               This is incase we want to update the select element's contents */
            $(this).select2("destroy");
        }

        $(this).select2(opts);
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
