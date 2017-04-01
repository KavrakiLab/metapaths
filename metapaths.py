import re, MySQLdb
import json
from flask import Flask, render_template, jsonify
app = Flask(__name__)


# Global dictionary for storing metapath search results
# graph_id : results object
graphs = {}
db = MySQLdb.connect(host="localhost", user="root", passwd="meta", db="hubdb")


#
# Helpers
#

def extract_pathways(string_pathways):
    pathways = []

    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    for string_path in string_pathways:
        path_compounds = regex.findall(string_path)
        nodes = set([])
        links = []
        hub_nodes = set([])
        hub_links = []

        for i in range(len(path_compounds) - 1):
            j = i + 1
            if "_HS" in path_compounds[i] and "_HE" in path_compounds[j]:
                hub_nodes.add(path_compounds[i][0:6])
                hub_nodes.add(path_compounds[j][0:6])
                hub_links.append({
                    "source" : path_compounds[i][0:6],
                    "target" : path_compounds[j][0:6]
                })
            else:
                nodes.add(path_compounds[i][0:6])
                nodes.add(path_compounds[j][0:6])
                links.append({
                    "source" : path_compounds[i][0:6],
                    "target" : path_compounds[j][0:6]
                })

        nodes = list(nodes)
        hub_nodes = list(hub_nodes)

        pathway = {}
        pathway["atoms"] = 0 # TODO: actually calculate this
        pathway["nodes"] = [{"id" : nodes} for node in  nodes]
        pathway["links"] = links
        pathway["hub_nodes"] = [{"id" : hub_node} for hub_node in hub_nodes]
        pathway["hub_links"] = hub_links
        print(pathways)

        pathways.append(pathway)


    return pathways


def get_pathways_from_file(start, goal, pathways_filename):
    pathways_file = open(pathways_filename, "r")
    pathways = extract_pathways(pathways_file.readlines())

    pathways_json = json.dumps({
        "info" : {
            "start" : start,
            "goal" : goal
            },
        "pathways" : pathways
        })
    return pathways_json


def hub_paths_to_json(hub_src, hub_dst, string_hub_pathways):
    pathways = []

    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    for string_path in string_hub_pathways:
        path_compounds = regex.findall(string_path[0])

        links = []
        for i in range(len(path_compounds) - 1):
            j = i + 1
            links.append(path_compounds[i] + "," + path_compounds[j])

        pathway = {}
        pathway["atoms"] = 0 # TODO: actually calculate this
        pathway["nodes"] = path_compounds
        pathway["links"] = links

        pathways.append(pathway)


    hub = {
        "info" : {"source" : hub_src, "target" : hub_dst},
        "pathways" : pathways
    }
    return jsonify(hub)


#
# Routes
#

@app.route('/')
def search_page():
    """
    Loads the main page
    """
    return render_template('search-page.html')


@app.route('/visualize')
def visualize():
    """
    Loads the visualization page
    """
    return render_template('viz-page.html')


@app.route('/get_hub_paths/<hub_src>/<hub_dst>')
def get_hub_paths(hub_src, hub_dst):
    """
    Returns visualization formatted JSON describing the pathways between the
    two hub compounds
    """
    cursor = db.cursor()
    cursor.execute("SELECT paths FROM " + hub_src + "_" + hub_dst + "")
    return hub_paths_to_json(hub_src, hub_dst, cursor.fetchall())


@app.route('/load_graph/<graph_id>')
def load_data(graph_id):
    """
    Looks up the graph associated with this graph_id and responds with a JSON
    representation of the graph
    """
    # TODO: validate the JSON? Return error code if invaild
    graph = graphs[graph_id]
    # TODO: convert to JSON and send in the response


@app.route('/search')
def search():
    """
    Executes a user's configured search, stores the resulting graph locally and
    responds with a graph_id which can be used to later vizualize the results
    """
    # TODO: Generate a graph_id
    # TODO: Execute the search (async?)
    # TODO: Return the graph_id in the reponse


@app.route('/help')
def help():
    """
    Loads the help page
    """
    return render_template('help-page.html')
