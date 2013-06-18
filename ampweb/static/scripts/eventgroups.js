/*
 * Toggle the visibility of the event group details.
 */
function showGroup(id) {
    var group = document.getElementById("group_" + id);
    if ( group ) {
        if ( group.style.display == "block" )
            group.style.display = "none";
        else
            group.style.display = "block";
    }
}


