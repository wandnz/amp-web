/* This file defines functions that deals with the formatting and display of
 * the tic labels for the Cuz graphs (both summary and detail).
 */

var datetics = new Array();
var month_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");

/* Clears the datetics array so that the date tics on the detail graph will
 * be calculated afresh */
function resetDetailXTics() {
    datetics.length = 0;
}

function displayDetailXTics(ts, o) {

   var dtic, mins, ttic;
   var d = new Date();
   d.setTime(ts);

   dtic = month_names[d.getMonth()] + " " + d.getDate();
   mins = d.getMinutes() + "";

   /* Pad the minutes with a zero if necessary */
   if (mins.length == 1)
       mins = "0" + mins;

   /* Currently we use a comma to separate the date and
    * time portion of the tic labels.
    */
   ttic = ", " + d.getHours() + ":" + mins;

   /* If the range of the detailed graph is more than
    * 36 hours, don't display the time on the xtics.
    * Also, make sure we only display one tic per day.
    */
   if ((o.max - o.min) > (60 * 60 * 36 * 1000.0)) {
       if (datetics.length == 0) {
           datetics.push(dtic);
           return dtic;
       }

       if (datetics[datetics.length - 1] != dtic) {
           datetics.push(dtic);
           return dtic;
       }
       return "";
   }

   /* Otherwise, display both the date and time for all tics.
    *
    * TODO Find a way to insert a newline into these tics. The 
    * templating replaces any \n's with spaces so we can't use them. The 
    * tics would look a lot nicer if they were:
    *      16:00
    *      Aug 15
    * rather than being crammed on the same line.
    */
   return dtic + ttic;

}

function generateSummaryXTics(start, end) {
    var ticlabels = [];
    var oneday = (60 * 60 * 24);
    var startdate = new Date(start * 1000.0);
    var enddate = new Date(end * 1000.0);

    startdate.setHours(0);
    startdate.setMinutes(0);
    startdate.setSeconds(0);
    startdate.setMilliseconds(0);

    var days = (end - start) / oneday;
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
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
