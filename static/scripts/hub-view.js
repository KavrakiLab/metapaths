var full_viz = null

function init_hub_view(hub_link) {
    console.log(hub_link);

    var request_url = "/get_hub_paths/" + hub_link.source.id + "/" + hub_link.target.id;

    $.get(request_url).done(function (response) {
        var hub_data_graph = extract_hub_data_graph(response);
        console.log(hub_data_graph);

        var hub_viz_graph = load_hub_viz(hub_data_graph);

        // Get KEGG data for any new compounds and add to the global kegg_data dict
        get_kegg_data(hub_data_graph.nodes);

        // Attach the same node watchers as for the full viz
        attach_node_watchers(hub_viz_graph);

        show_hub_view();
    }).fail(function() {
        alert("ERROR: Failed to retrieve hub information.");
    });
}

function extract_hub_data_graph(hub_info) {
    console.log(hub_info);
    var hub_data_graph = {};

    var node_set = new Set();
    var link_set = new Set();

    hub_info.pathways.forEach(function (pathway, index, array) {
        for (var n of pathway.nodes) {
            node_set.add(n);
        }
        for (var l of pathway.links) {
            link_set.add(l);
        }
    });

    var nodes = []
    var links = []
        for (var n of node_set) {
            nodes.push({ "id" : n });
        }
        for (var l of link_set) {
            ends = l.split(",");
            links.push({ "source" : ends[0], "target" : ends[1] });
        }

    return {
        "nodes" : nodes,
        "links" : links,
        "source" : hub_info.info.source,
        "target" : hub_info.info.target
    };

    return hub_data_graph;
}

function load_hub_viz(hub_data_graph) {
    var margin = {top: -5, right: -5, bottom: -5, left: -5},
        width = $("#viz-column")[0].offsetWidth - margin.left - margin.right,
        height = $("#viz-column")[0].offsetHeight - margin.top - margin.bottom;

    var drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    var zoom = d3.zoom()
        .scaleExtent([0.1,10])
        .on("zoom", function() {
            container.attr("transform", "translate(" + d3.event.transform.x + ',' + d3.event.transform.y + ")scale(" + d3.event.transform.k + ")");
        });

    // Create an SVG for the hub
    d3.select("#viz-column").append("svg").attr("id", "hub")

    var svg = d3.select("#hub")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
            .call(zoom)
            .on("dblclick.zoom", null); // disable dblclick to zoom, since dblclick is used to release fixed nodes

    var rect = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    var container = svg.append("g");

    var link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(hub_data_graph.links)
        .enter().append("line")
        .attr("id", function(link) {return get_link_id(link);})
        .attr("class", "internal-link");

    link.data().forEach(function (l, index, array) {
        l.id = get_link_id(l);
    })

    var node = container.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(hub_data_graph.nodes)
        .enter().append("circle")
        .attr("id", function(node) {return node.id;})
        .attr("class", function(node) {
            if (node.id === hub_data_graph.source) {
                node.fixed = true;
                node.fx = 50;
                node.fy = height / 2;
                return "hub-source-node";
            } else if (node.id === hub_data_graph.target) {
                node.fixed = true;
                node.fx = width - 50;
                node.fy = height / 2;
                return "hub-target-node";
            } else {
                return "internal-node";
            }
        })
        .call(drag);

    node.append("title")
        .text(function(node) { return node.id; });

    var label = container.append("g")
        .selectAll("text")
        .data(hub_data_graph.nodes)
        .enter().append("text")
            .attr("class", "internal-node-label")
            .text(function(d) { return d.id });

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(-5).strength(1.0))
        .force("charge", d3.forceCollide(50))
        .force("center", d3.forceCenter(width / 2, height / 2));

    simulation
        .nodes(hub_data_graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(hub_data_graph.links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
        label
            .attr("dx", function(d) { return d.x - 24; })
            .attr("dy", function(d) { return d.y - 24; });
    } // ticked

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d.fixed = true;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
    }

    return {"node" : node, "link" : link};
} // load_hub_viz


function cancel_hub_edits() {
    // TODO

    close_hub_view();
}

function apply_hub_edits() {
    // TODO

    close_hub_view();
}

function show_hub_view() {
    // Hide the full visualization
    full_viz = $("#viz").remove()

    $("#hub-btns")[0].style.visibility = "visible";
}

function close_hub_view() {
    $("#hub-btns")[0].style.visibility = "hidden";
    $("#hub").remove()
    $("#viz-column").append(full_viz);
}









function simple_clone(original) {
    return JSON.parse(JSON.stringify(original));
}

