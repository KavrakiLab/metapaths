
function initialize_search_panel() {
    // TODO: should we fetch nicely formatted results from the server?
    var dropdown_data = [{"id": 1, "text" : "foo"},{"id": 2, "text" : "bar"}];

    // Enable select menu
    $('select').select2({
        data: dropdown_data,
        placeholder: "Start type or select an item",
        allowClear: true
    });


    // Initially no value is selected
    clear_search();
}

function clear_search() {
    $('select').select2().val(null).trigger("change");
}
