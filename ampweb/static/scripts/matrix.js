$(document).ready(function(){
    $('#AMP_matrix').dataTable({
        "bInfo": false, //disable table information
        "bProcessing": true, //enabling processing indicator
        "bSortClasses": false, //disable the addition of sorting classes
        "bStateSave": true, //saves user table state in a cookie
        "bPaginate": false //disable pagination
    });
});
