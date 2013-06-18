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
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
