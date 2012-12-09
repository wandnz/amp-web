var matrix;
$(document).ready(function(){
    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, //disable table information
        "bProcessing": true, //enabling processing indicator
        "bSortClasses": false, //disable the addition of sorting classes
        "bStateSave": true, //saves user table state in a cookie
        "bPaginate": false, //disable pagination
        "bServerSide": true, //user server side processing
        "sAjaxSource": "/update_matrix" //get ajax data from this source
    });
    reDraw(); //Will need to find another way to do this
});

function reDraw() {
    matrix.fnDraw();
    setTimeout(reDraw, 1000);
}
