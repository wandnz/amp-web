/*
 * Toggle the visibility of the event group details.
 */
function showGroup(id) {
    var group = $("#group_" + id);
    if (group.css('display') == 'none') {
	    group.stop().slideDown(200);
	} else {
		group.stop().slideUp(200);
	}
}


