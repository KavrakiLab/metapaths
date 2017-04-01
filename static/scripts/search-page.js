$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});
});

function upload() {
    location.assign("/visualize");
}

function load_search(search_id) {
    localStorage.setItem("search_id", search_id);
    location.assign("/visualize");
}
