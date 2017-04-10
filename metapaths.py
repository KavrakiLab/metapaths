import re, MySQLdb
import json
from flask import Flask, render_template, jsonify
app = Flask(__name__)


# Global dictionary for storing metapath search results
searches = {}

# TODO: This is just for testing; remove later
searches["test"] = "static/pathways/custom_pathways.txt"

# KEGG ID to compound name mapping
compound_names = {}


#
# Helpers
#

def extract_pathways(string_pathways):
    pathways = []

    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    start = None
    goal = None
    for string_path in string_pathways:
        path_compounds = regex.findall(string_path)
        nodes = set([])
        links = []
        hub_nodes = set([])
        hub_links = []

        if start == None and goal == None:
            start = path_compounds[0]
            goal = path_compounds[-1]

        for i in range(len(path_compounds) - 1):
            j = i + 1
            if "_HS" in path_compounds[i] and "_HE" in path_compounds[j]:
                hub_nodes.add(path_compounds[i])
                hub_nodes.add(path_compounds[j])
                hub_links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])
            else:
                links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])

        pathway = {}
        pathway["atoms"] = 0 # TODO: actually calculate this
        pathway["nodes"] = [node[0:6] for node in (set(path_compounds) - hub_nodes)]
        pathway["links"] = list(links)
        pathway["hub_nodes"] = [hub_node[0:6] for hub_node in hub_nodes]
        pathway["hub_links"] = list(hub_links)
        print(pathways)

        pathways.append(pathway)

    pathways_data = {
        "info" : {
            "start" : start,
            "goal" : goal
            },
        "pathways" : pathways
    }

    return pathways_data


def get_pathways_from_file(pathways_filename):
    pathways_file = open(pathways_filename, "r")
    return extract_pathways(pathways_file.readlines())



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

        # Empty list since hub pathways don't contain hubs themselves
        pathway["hub_links"] = []
        pathway["hub_nodes"] = []

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
    db = MySQLdb.connect(host="localhost", user="root", passwd="meta", db="hubdb")
    cursor = db.cursor()
    cursor.execute("SELECT paths FROM " + hub_src + "_" + hub_dst + "")
    results_json = hub_paths_to_json(hub_src, hub_dst, cursor.fetchall())
    cursor.close()
    db.close()
    return results_json


@app.route('/load_previous/<search_id>')
def load_previous(search_id):
    """
    Looks up the graph associated with this graph_id and responds with a JSON
    representation of the graph
    """
    global searches

    search_result_file = searches[search_id]
    return json.dumps(get_pathways_from_file(search_result_file))


@app.route('/search')
def search():
    """
    Executes a user's configured search, stores the resulting graph locally and
    responds with a graph_id which can be used to later vizualize the results
    """
    # TODO: Generate a graph_id
    # TODO: Execute the search (async?)
    # TODO: Return the graph_id in the response


@app.route('/help')
def help():
    """
    Loads the help page
    """
    return render_template('help-page.html')


@app.route('/get_compound_names')
def get_compound_names():
    """
    Returns a mapping of KEGG IDs to compound names
    """
    return json.dumps(compound_names)


def initialize():
    """
    Runs when server is first started
    """
    print "Initializing..."

    db = MySQLdb.connect(host="localhost", user="root", passwd="meta", db="metadb")
    cursor = db.cursor()
    cursor.execute("SELECT KEGGCompoundID, CompoundName from KEGGCompoundNames;")


    for compound in cursor.fetchall():
        compound_names[compound[0]] = compound[1]

    cursor.close()
    db.close()


initialize()
