$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});

    $.get("/get_compound_names").done(function(results_json) {
        var compound_names = format_compounds(JSON.parse(results_json));

        $('#start-compound').select2({
            data: compound_names,
            placeholder: "Select a start compound",
            allowClear: true
        });
        $('#target-compound').select2({
            data: compound_names,
            placeholder: "Select a target compound",
            allowClear: true
        });
    }).fail(function(error) {
        console.log(error);
        alert("An error occured, please refresh the page to try again.");
    });

});

function upload() {
    location.assign("/visualize");
}

function load_search(search_id) {
    localStorage.setItem("search_id", search_id);
    location.assign("/visualize");
}

function format_compounds(name_map) {
    var formatted_names = [];

    for (var id in name_map) {
        formatted_names.push({
            "id" : id,
            "text" : name_map[id]
        });
    }

    return formatted_names;
    
}
