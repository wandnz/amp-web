$(document).ready(function() {
    var uri = window.location.href;

    if ( uri.substring(0, 5) == 'http:' )
        uri = uri.slice(7);
    else if ( uri.substring(0, 6) == 'https:')
        uri = uri.slice(8);
    else return;

    var pieces = uri.split('/');
    $('#page > nav > ul > li#tab-' + pieces[1]).addClass('current');
});