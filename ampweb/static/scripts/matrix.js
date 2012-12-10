var matrix;
$(document).ready(function(){
    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, //disable table information
        "bProcessing": true, //enabling processing indicator
        "bStateSave": true, //saves user table state in a cookie
        "bPaginate": false, //disable pagination
        "bJQueryUI": true, //enable JQuery UI for ThemeRoller support
        "sAjaxSource": "/update_matrix" //get ajax data from this source
    });
    setInterval("reDraw()", 1000);
});

function reDraw() {
    matrix.fnReloadAjax();
}
