import re, MySQLdb
import json
import pathway_search
from pathway_search import make_celery
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
app.config.update(
    CELERY_BROKER_URL='redis://localhost:6379',
    CELERY_RESULT_BACKEND='redis://localhost:6379'
)
celery = make_celery(app)

# Global dict mapping search_id to AsyncResult objects
tasks = {}
# TODO: create periodic celery task that iterates through tasks,
# checks for completed ones and processes output
# TODO: remove, for testing only
tasks["test_id"] = "foobar";

# Global dictionary for storing metapath search results
searches = {}

# TODO: This is just for testing; remove later
searches["test_id"] = "static/pathways/custom_pathways.txt"

# KEGG ID to compound name mapping
compound_names = {}

# KEGG ID to compound name mapping of just hub compounds
hub_compounds = {}

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


@app.route('/visualize/<search_id>')
def visualize_previous(search_id):
    """
    Loads the visualization page for a previously executed search
    """
    if search_id in tasks:
        return render_template('viz-page.html')
    else:
        return "The results for search ID '" + str(search_id) + "' are not yet available."


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


@app.route('/load_results/<search_id>')
def load_result(search_id):
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
    responds with a search id which can be used to later vizualize the results
    """
    # TODO: Generate a graph_id
    # TODO: Execute the search (async?)
    # TODO: Return the graph_id in the response


@app.route('/hub_search')
def hub_search():
    """
    Executes a user's configured hub search, stores the resulting graph locally
    and responds with a search id which can be used to later vizualize the results
    """

    search_id = str(uuid.uuid4()) # TODO: Is this okay to do?
    pathway_search.execute_hub_search.delay(search_id, request.args["start"], request.args["target"], request.args["hubs"], request.args["atoms"], request.args["reversible"])
    return json.dumps({"search_id" : search_id});


@app.route('/lpat_search')
def lpat_search():
    """
    Executes a user's configured LPAT search, stores the resulting graph locally
    and responds with a search id which can be used to later vizualize the results
    """

    result = pathway_search.execute_lpat_search.delay(search_id, request.args["start"], request.args["target"], request.args["atoms"], request.args["reversible"])
    tasks[result.id] = result
    return json.dumps({"search_id" : result.id});


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


@app.route('/get_hub_compounds')
def get_hub_compounds():
    """
    Returns a list of hub compound KEGG IDs
    """
    # TODO: better way? Should this list just be in the JS? Get from a DB table?
    return json.dumps(hub_compounds)


def initialize():
    """
    Runs when server is first started
    """
    global compound_names

    print "Initializing..."

    db = MySQLdb.connect(host="localhost", user="root", passwd="meta", db="metadb")
    cursor = db.cursor()
    cursor.execute("SELECT KEGGCompoundID, CompoundName from KEGGCompoundNames;")


    for compound in cursor.fetchall():
        compound_names[compound[0]] = compound[1]

    cursor.close()
    db.close()

    for hub in ["C00022","C00047","C00024","C00083","C00025","C00026","C00448","C00033","C00058","C00037","C00043","C02557","C00041","C00235","C00167","C00341","C00048","C00129","C00044","C00064","C00223","C00353","C00097","C00062","C00052","C00051","C01054","C00036","C00084","C00049","C00132","C00124","C00065","C00128","C00091","C00100","C00074","C00079","C00082","C00090","C00096","C00157","C00073","C00086","C00119","C00219","C00078","C00111","C00085","C00103","C00121","C00180","C00099","C00169","C00042"]:
        hub_compounds[hub] = compound_names[hub]


initialize()
