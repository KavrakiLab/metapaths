
function initialize_search_panel() {
    // TODO: should we fetch nicely formatted results from the server?
    $('select')[0].innerHTML = generate_dropdown_data();


    // Enable select menu
    $('select').select2({
        placeholder: "Start type or select an item",
        allowClear: true
    });

    $('select').on("select2:select", function(e){
        var selected_val = $('select').select2().val();
        highlight(selected_val);
    });

    $('select').on("select2:selecting", function(e){
        var unselected_val = $('select').select2().val();
        if (unselected_val != null) {
            remove_highlight(unselected_val);
        }
    });

    // Initially no value is selected
    clear_search();
}


function highlight(hl_element) {
    // TODO: need a better way to check this, could be an organism that starts with C
    if (hl_element.startsWith('C')) {
        $("#" + hl_element)[0].style.stroke = "#ff997c";
        $("#" + hl_element)[0].style.strokeWidth = "7px";
    }
}

function remove_highlight(hl_element) {
    // TODO: need a better way to check this, could be an organism that starts with C
    if (hl_element.startsWith('C')) {
        if ($("#" + hl_element).length > 0) {
            $("#" + hl_element)[0].style.stroke = "";
            $("#" + hl_element)[0].style.strokeWidth = "3px";
        }
    }
}

function generate_dropdown_data() {
    var options_html  = "<optgroup label='Compounds'>";

    d3.selectAll("circle").data().forEach(function(node) {
        options_html += "<option value='" + node.id + "'>" + kegg_data[node.id].name + "</option>";
    });
    options_html += "</optgroup><optgroup label='Organisms'>";
    options_html += "<option value='test-organism'>Test Organism</option>";
    options_html += "</optgroup>";

    return options_html;
}


function clear_search() {
    var selected_val = $('select').select2().val();
    if (selected_val != null) {
        remove_highlight(selected_val)
    }
    $('select').select2().val(null).trigger("change");
}
