$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});

    var alg_options = [{ id: 0, text: 'Hub Search' }, 
                        { id: 1, text: 'LPAT' }];
                        //{ id: 2, text: 'MetaGraph' }
                        

    $("#algorithm").select2({data: alg_options});
    $("#algorithm").on("select2:select", function(e) {
        if ($("#algorithm").val() === "0") {
            //$("#hub-compounds-group").show();
	        $("#hub-database-group").show();
        } else {
            //$("#hub-compounds-group").hide();
	        $("#hub-database-group").hide();
        }
    });

    $("#algorithm").val("1").trigger("change"); // Set the default to LPAT

    var hubdb_options = [{id:'HubT_out_20;hub_list_out_20.txt',text:"20 Hubs (Out-Degree)"},
                         //{id:'HubT_in;hub_list_in.txt',text:"47 Hubs (In-degree)"},
                         //{id:'HubT_out;hub_list_out.txt',text:"47 Hubs (Out-degree)"},
                         {id:'HubT_out_50;hub_list_out_50.txt', text:"50 Hubs (Out-Degree)"},
                         {id:'HubT_in_50;hub_list_in_50.txt',text:"50 Hubs (In-Degree)"},
                         {id:'HubT_io_50;hub_list_io_50.txt',text:"50 Hubs (Degree)"},
                         {id:'HubT_Araki;Araki_2015.txt',text:"139 Hubs (Araki et al. 2015)"}];
    $("#hub-db").select2({data: hubdb_options});
    $("#hub-db").val("HubT_out_50;hub_list_out_50.txt").trigger("change");

    $.get("/get_compound_names").done(function(results_json) {
        var formatted_compounds = format_compounds(JSON.parse(results_json));

        initialize_dropdowns(formatted_compounds);

    }).fail(function(error) {
        console.log(error);
        alert("An error occured, please refresh the page to try again.");
    });

    $.get("/get_hub_compounds").done(function(results_json) {
        $('#hub-compounds').select2({
            data: format_compounds(JSON.parse(results_json))
        });

        if ($("#algorithm").val() === "0") {
            //$("#hub-compounds-group").show();
	        $("#hub-database-group").show();
        } else {
            //$("#hub-compounds-group").hide();
	        $("#hub-database-group").hide();
        }
    });

});

function upload() {
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

    return formatted_names.sort(function(a,b) {
        return a.text.length - b.text.length;
    });

}

function search() {
    hub_db_value = $("#hub-db").val()
    split_hub_db = hub_db_value.split(";")

    // If user selected hub search
    if ($("#algorithm").val() === "0") {
        var query = {
            "start" : $("#start-compound").val(),
            "target" : $("#target-compound").val(),
            "hubcompounds" : split_hub_db[1],
            "carbontrack" : $("input[name=carbontracking]:checked").val(),
            "reversible" : $("#allow-reversible").is(":checked"),
            "hub_db" : split_hub_db[0],
        }
        //console.log(JSON.stringify($("#hub-compounds option:selected").val()));
        execute_search("/hub_search", query);

    } else if ($("#algorithm").val() === "1") {
        // User selected LPAT
        var query = {
            "start" : $("#start-compound").val(),
            "target" : $("#target-compound").val(),
            "carbontrack" : $("input[name=carbontracking]:checked").val(),
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
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: query,
        traditional: true,
        success: function(response) {
            var search_id = response["search_id"];

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
		//found.sort(function(a,b){return a.text.length - b.text.length});

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


function select_all_hubs() {
    $("#hub-compounds > option").prop("selected","selected");
    $("#hub-compounds").trigger("change");
}

function remove_all_hubs() {
    $("#hub-compounds > option").removeAttr("selected");
    $("#hub-compounds").trigger("change");
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function get_available_searches() {
    $.get("/get_available_searches").done(function(results_json) {
        var available_search_ids = JSON.parse(results_json);
        var html = "<br><div class='alert alert-success alert-dismissible' role='alert'>";
        html += "<button type='button' class='close' data-dismiss='alert' aria-label='Close'> <span aria-hidden='true'>&times;</span></button>"
        html += "<table class='table table-hover'>\
                        <thead><tr>\
                            <th>Start</th>\
                            <th>Target</th>\
                            <th>Algorithm</th>\
                            <th>Hub Table</th>\
                            <th>Results</th>\
                        </tr></thead>\
                        <tbody>"                        
        available_search_ids.forEach(function(raw_id) {
            var id = raw_id.split("|");
            if(typeof id[1] === 'string') {
                id[1] = id[1].replaceAll("_"," ");
            }
            if(typeof id[2] === 'string') {
                id[2] = id[2].replaceAll("_"," ");
            }
            var hub_table = "N/A";
            if(id.length >= 5) {
                hub_table = id[4]
            }
            html += "<tr>\
                                <td>" + id[1] + "</td>\
                                <td>" + id[2] + "</td>\
                                <td>" + id[3] + "</td>\
                                <td>" + hub_table + "</td>\
                                <td><a id='test' class='btn btn-default' href='/visualize/" + raw_id + "'>View</a></td>\
                            </tr>";
        });
        html += "</tbody>\
                    </table><div>"
        $("#more-pathways").html(html);

    }).fail(function(error) {
        console.log(error);
        alert("Unable to find more pathway results.");
    });
}

