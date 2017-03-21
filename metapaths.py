import re, json, MySQLdb
from flask import Flask, render_template
app = Flask(__name__)


# Global dictionary for storing metapath search results
# graph_id : results object
graphs = {}
db = MySQLdb.connect(host="localhost", user="root", passwd="meta", db="hubdb")


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


def get_hub_paths(hub_src, hub_dst):
    """
    Returns visualization formatted JSON describing the pathways between the
    two hub compounds
    """
    cursor = db.cursor()
    cursor.execute("SELECT paths FROM " + hub_src + "_" + hub_dst + "")
    return hub_paths_to_json(hub_src, hub_dst, cursor.fetchall())


def extract_pathways(string_pathways):
    pathways = []

    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    for string_path in string_pathways:
        path_compounds = regex.findall(string_path[0])

        links = []
        for i in range(len(path_compounds) - 1):
            j = i + 1
            links.append({"source" : path_compounds[i], "target" : path_compounds[j]})

        pathway = {}
        pathway["atoms"] = 0 # TODO: actually calculate this
        pathway["nodes"] = [{"id" : node} for node in set(path_compounds)]
        pathway["links"] = links
        pathway["hub_nodes"] = [] # TODO: remove
        pathway["hub_links"] = [] # TODO: remove

        pathways.append(pathway)

    return pathways


def hub_paths_to_json(hub_src, hub_dst, string_pathways):
    pathways = extract_pathways(string_pathways)
    hub = {
        "info" : {"start" : hub_dst, "target" : hub_dst},
        "pathways" : pathways
    }
    return json.dumps(hub)



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
