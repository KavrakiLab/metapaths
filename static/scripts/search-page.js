$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});

    var alg_options = [{ id: 0, text: 'Hub Search' }, { id: 1, text: 'LPAT' }, { id: 2, text: 'MetaGraph' }];

    $('#algorithm').select2({data: alg_options});

    $.get("/get_compound_names").done(function(results_json) {
        var formatted_compounds = format_compounds(JSON.parse(results_json));

        initialize_dropdowns(formatted_compounds);

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
            "text" : name_map[id] + " (" + id + ")"
        });
    }

    return formatted_names;

}

function search() {

    // If user selected hub search
    if ($("#algorithm").val() === "0") {
        var query = {
            "start" : $("#start-compound").val(),
            "target" : $("#target-compound").val(),
            "atoms" : parseInt($("#num-atoms").val()),
            "reversible" : $("#allow-reversible").is(":checked")
        }
        execute_search("/hub_search", query);

    } else if ($("#algorithm").val() === "1") {
        // User selected LPAT
        var query = {
            "start" : $("#start-compound").val(),
            "target" : $("#target-compound").val(),
            "atoms" : parseInt($("#num-atoms").val()),
            "reversible" : $("#allow-reversible").is(":checked")
        }
        execute_search("/lpat_search", query);

    } else if ($("#algorithm").val() === "2") {
        // User selected MetaGraphs
    } else {
        alert("Invalid algorithm selection.");
        return;
    }

}

function execute_search(alg_url, query) {
    console.log("Sending query: ", query, " to: ", alg_url);

    $.ajax({
        url: alg_url,
        data: query,
        success: function(response) {
            var search_id = JSON.parse(response)["search_id"];

            var results_url = window.location.href + "visualize/" + search_id;

            var alert_html = "<br><div class='alert alert-success alert-dismissible' role='alert'>";
            alert_html += "<button type='button' class='close' data-dismiss='alert' aria-label='Close'> <span aria-hidden='true'>&times;</span></button>"
            alert_html += "Your pathway search has been submitted. The results can be viewed at this link: <a href='" + results_url + "'>" + results_url + "</a>"
            alert_html += "<div>"

            $("#alert-location").html(alert_html);

        }
    });
}


function initialize_dropdowns(items) {
    /* Magic: http://stackoverflow.com/questions/32756698/how-to-enable-infinite-scrolling-in-select2-4-0-without-ajax/33536126#33536126
     * This code is necessary to allow for pagination of the large number of options for these dropdowns.
     */
    $.fn.select2.amd.define('select2/data/customAdapter', ['select2/data/array', 'select2/utils'],
        function (ArrayData, Utils) {
            function CustomDataAdapter($element, options) {
                CustomDataAdapter.__super__.constructor.call(this, $element, options);
            }

            Utils.Extend(CustomDataAdapter, ArrayData);

            CustomDataAdapter.prototype.current = function (callback) {
                var found = [],
                    findValue = null,
                    initialValue = this.options.options.initialValue,
                    selectedValue = this.$element.val(),
                    jsonData = this.options.options.jsonData,
                    jsonMap = this.options.options.jsonMap;

                if (initialValue !== null){
                    findValue = initialValue;
                    this.options.options.initialValue = null;  // <-- set null after initialized
                }
                else if (selectedValue !== null){
                    findValue = selectedValue;
                }

                if(!this.$element.prop('multiple')){
                    findValue = [findValue];
                    this.$element.html();     // <-- if I do this for multiple then it breaks
                }

                // Query value(s)
                for (var v = 0; v < findValue.length; v++) {
                    for (var i = 0, len = jsonData.length; i < len; i++) {
                        if (findValue[v] == jsonData[i][jsonMap.id]){
                           found.push({id: jsonData[i][jsonMap.id], text: jsonData[i][jsonMap.text]});
                           if(this.$element.find("option[value='" + findValue[v] + "']").length == 0) {
                               this.$element.append(new Option(jsonData[i][jsonMap.text], jsonData[i][jsonMap.id]));
                           }
                           break;
                        }
                    }
                }

                // Set found matches as selected
                this.$element.find("option").prop("selected", false).removeAttr("selected");
                for (var v = 0; v < found.length; v++) {
                    this.$element.find("option[value='" + found[v].id + "']").prop("selected", true).attr("selected","selected");
                }

                // If nothing was found, then set to top option (for single select)
                if (!found.length && !this.$element.prop('multiple')) {  // default to top option
                    found.push({id: jsonData[0][jsonMap.id], text: jsonData[0][jsonMap.text]});
                    this.$element.html(new Option(jsonData[0][jsonMap.text], jsonData[0][jsonMap.id], true, true));
                }

                callback(found);
            };

            CustomDataAdapter.prototype.query = function (params, callback) {
                if (!("page" in params)) {
                    params.page = 1;
                }

                var jsonData = this.options.options.jsonData,
                    pageSize = this.options.options.pageSize,
                    jsonMap = this.options.options.jsonMap;

                var results = $.map(jsonData, function(obj) {
                    // Search
                    if(new RegExp(params.term, "i").test(obj[jsonMap.text])) {
                        return {
                            id:obj[jsonMap.id],
                            text:obj[jsonMap.text]
                        };
                    }
                });

                callback({
                    results:results.slice((params.page - 1) * pageSize, params.page * pageSize),
                    pagination:{
                        more:results.length >= params.page * pageSize
                    }
                });
            };

            return CustomDataAdapter;

    });

    var jsonAdapter=$.fn.select2.amd.require('select2/data/customAdapter');

    $('#start-compound').select2({
        ajax: {},
        placeholder: "Select a start compound",
        jsonData: items,
        jsonMap: {id: "id", text: "text"},
        initialValue: "C00668",
        pageSize: 50,
        dataAdapter: jsonAdapter
    });

    $('#target-compound').select2({
        ajax: {},
        placeholder: "Select a target compound",
        jsonData: items,
        jsonMap: {id: "id", text: "text"},
        initialValue: "C01613",
        pageSize: 50,
        dataAdapter: jsonAdapter
    });

}

