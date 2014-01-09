/* Various utility functions that might be used in multiple places */

function startHistory(window) {
    var History = window.History;
    if (!History.enabled) {
        /* History.js is disabled for this browser */
        
        /* XXX Not sure why we are returning false here -- this return value
         * is never checked so it seems a little silly. Examples do this, but
         * they're usually at the top level of the script where returning
         * false will probably stop the whole script?
         */
        return false;
    }
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
        for ( var line in legend[group_id].keys ) {
            count++;
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
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
