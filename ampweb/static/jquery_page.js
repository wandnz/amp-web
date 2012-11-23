function remove(event){
	$(event.parentNode).remove();
}
function clone(event){
	var $clone = $(event.parentNode).clone();
	$clone.draggable({ containment: "#container", scroll: false });
	$clone.removeAttr("id");
	$clone.children("p").text("Cloned Widget");
	$clone.appendTo('#container');
}

