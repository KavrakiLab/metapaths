$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});
});

function upload() {
    location.assign("/visualize");
}
