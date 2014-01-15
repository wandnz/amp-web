/* Various utility functions that might be used in multiple places */

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

    $('#page > nav > ul > li#tab-' + (segments[0] || 'dashboard'))
            .addClass('current');
});

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

/* Default colour assignment for graph lines */
function getSeriesHue(seriesid) {
    /* http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/ */
    /*
     * 0.618033988749895 is the golden ratio conjugate that was used when
     * hue was in the range 0-1, I've multiplied it by 360 to fit the range
     * 0-360, is this sensible? What about a Sobol or Halton sequence?
     */
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
            for ( var line in legend[group_id].keys ) {
                if ( legend[group_id].keys.hasOwnProperty(line) ) {
                    count++;
                }
            }
        }
    }
    return count;

}

/* Function to extract the timezone from a string representation of a date.
 * Every browser seems to express date strings differently, so this becomes
 * a pretty hax function.
 */
function getTZLabel() {

    /* This function is balls -- surely there is a better way to get this
     * than this collection of hacks */

    var parts = (new Date()).toString().split(" ");
    var datestr = "Unknown Timezone";

    /* Firefox, Safari, Chrome */
    if (parts.length == 7) {
        datestr = parts[5] + " " + parts[6];
    }

    /* IE 10 and Opera */
    if (parts.length == 6) {

        /* If this regex matches, we're looking at Opera */
        if (parts[5].match(/GMT/) != null)
            datestr = parts[5];
        else
            datestr = parts[4];
    }

    /* TODO: Older IE? */

    return datestr;
}

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

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
