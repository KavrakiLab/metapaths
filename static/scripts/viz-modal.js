/* TODO: the same modal is used for different hub views; need a way to clear
   out previously viewed hub and update with the requested one */

function open_modal(hub_info) {
    console.log(hub_info);
   $("#hub-modal-title")[0].innerText = "Internal Hub Paths: " + hub_info.id;

    // Show the hub visualization
   $("#hub-modal").modal();
   load_hub_viz(hub_info);

}


function load_hub_viz(hub_info) {
    var margin = {top: -5, right: -5, bottom: -5, left: -5};
    var width = $("#hub-modal").width() - margin.left - margin.right;
    var height = $("#hub-modal-body").height() - margin.top - margin.bottom;

    var drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    var zoom = d3.zoom()
        .scaleExtent([0.1,10])
        .on("zoom", function() {
            container.attr("transform", "translate(" + d3.event.transform.x + ',' + d3.event.transform.y + ")scale(" + d3.event.transform.k + ")");
        });

    console.log(width);
    console.log(height);
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
        .data(hub_info.internal_links)
        .enter().append("line")
        .attr("id", function(link) {return get_link_id(link);})
        .attr("class", "internal-link");

    link.data().forEach(function (l, index, array) {
        l.id = get_link_id(l);
    })

    var internal_nodes = hub_info.internal_nodes;
    internal_nodes.push(hub_info.source);
    internal_nodes.push(hub_info.target);

    console.log(internal_nodes);
    var node = container.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(internal_nodes)
        .enter().append("circle")
        .attr("id", function(node) {return node.id;})
        .attr("class", function(node) {
            if (node.id === hub_info.start) {
                return "hub-source-node";
            } else if (node.id === hub_info.goal) {
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
        .data(internal_nodes)
        .enter().append("text")
            .attr("class", "node-label")
            .text(function(d) { return d.id });

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-10))
        .force("center", d3.forceCenter(width / 2, height / 2));

    simulation
        .nodes(internal_nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(hub_info.internal_links);

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

