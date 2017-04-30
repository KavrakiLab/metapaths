import MySQLdb
import json
import os
import subprocess
import uuid
import time
from helpers import generate_hub_config, generate_LPAT_config, extract_pathways, get_pathways_from_file, hub_paths_to_json, remove_input_file
from celery import Celery
from flask import Flask, render_template, jsonify, request

import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)



#
# Flask & Celery config
#

#  def make_celery(app):
    #  celery = Celery(app.import_name, backend=app.config['CELERY_RESULT_BACKEND'],
                    #  broker=app.config['CELERY_BROKER_URL'])
    #  celery.conf.update(app.config)
    #  TaskBase = celery.Task
    #  class ContextTask(TaskBase):
        #  abstract = True
        #  def __call__(self, *args, **kwargs):
            #  with app.app_context():
                #  return TaskBase.__call__(self, *args, **kwargs)
    #  celery.Task = ContextTask
    #  return celery

app = Flask(__name__)
#  app.config.update(
    #  CELERY_BROKER_URL='redis://localhost:6379',
    #  CELERY_RESULT_BACKEND='redis://localhost:6379'
#  )
celery = Celery('tasks', backend='rpc://', broker='pyamqp://')



#
# Globals
#

# Global mapping of search_id to Celery task IDs
tasks = {}

# Global dictionary for storing metapath search results
searches = {}

# KEGG ID to compound name mapping
compound_names = {}

# KEGG ID to compound name mapping of just hub compounds
hub_compounds = {}



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
def visualize_results(search_id):
    """
    Loads the visualization page for a previously executed search
    """
    global searches
    global celery

    print("Viz request for ", search_id)
    if search_id in tasks.keys():
        task_id = tasks[search_id]
        task = celery.AsyncResult(task_id)

        if task.state not in ["SUCCESS", "FAILURE"]:
            return "The results for search ID '" + str(search_id) + "' are not yet available."
        elif task.state == "SUCCESS":
            value = task.get()
            searches[search_id] = value
            remove_input_file(search_id)
            return render_template('viz-page.html')
        elif task.state == "FAILURE":
            # Task failed so remove it
            tasks.pop(search_id) # TODO: dict has not attr remove()
            remove_input_file(search_id)
            return "The search with ID '" + str(search_id) + "' failed and the results will not become available. Please execute a new search."
    elif search_id in searches.keys():
            return render_template('viz-page.html')
    else:
        return "Search ID '" + str(search_id) + "' was not found. Please execute a new search."


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
def load_results(search_id):
    """
    Looks up the graph associated with this graph_id and responds with a JSON
    representation of the graph
    """
    global searches

    if search_id in searches:
        search_result_file = searches[search_id]
        return json.dumps(get_pathways_from_file(search_result_file))
    else:
        print(search_id, "not in ", searches)
        return "500"

    #  search_result_file = searches[search_id]
    #  return json.dumps(get_pathways_from_file(search_result_file))


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

    search_id = str(uuid.uuid4())
    result = execute_hub_search.delay(search_id, request.args["start"],
            request.args["target"], request.args["carbontrack"],
            request.args["reversible"],
            json.loads(request.args["hubcompounds"]))
    tasks[search_id] = result.id
    return json.dumps({"search_id" : search_id});


@app.route('/lpat_search')
def lpat_search():
    """
    Executes a user's configured LPAT search, stores the resulting graph locally
    and responds with a search id which can be used to later vizualize the results
    """
    global tasks

    search_id = str(uuid.uuid4())
    result = execute_lpat_search.delay(search_id, request.args["start"],
            request.args["target"], request.args["carbontrack"],
            request.args["reversible"])
    tasks[search_id] = result.id
    return json.dumps({"search_id" : search_id});


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



#
# Celery Tasks
#

@celery.task()
def execute_hub_search(search_id, start, target, carbon_track, allow_reversible, selected_hub_compounds):
    global searches

    print "Executing Hub search with:"
    #  print(search_id, start, target, carbon_track, allow_reversible, selected_hub_compounds)
    #  print("hub compudns", type(selected_hub_compounds), selected_hub_compounds)
    input_loc, output_loc = generate_hub_config(start, target, carbon_track,
            allow_reversible, search_id, selected_hub_compounds)

    alg_output = subprocess.call(["java", "-jar",
        "searches/LinearPathwaySearch.jar", input_loc])
    print("alg_output", alg_output)
    if alg_output != 0:
        raise Exception("Hub execution failed, check Celery worker logs.")
        return None

    converter_output = subprocess.call(["python", "searches/path_convert.py",
        "hub", output_loc])
    print("converter_output", converter_output)
    if converter_output != 0:
        raise Exception("Converting Hub output to visualization format failed, check Celery worker logs.")
        return None

    return output_loc


@celery.task()
def execute_lpat_search(search_id, start, target, carbon_track, allow_reversible):
    global searches

    print "Executing LPAT search with:"
    print(start, target, carbon_track, allow_reversible)
    input_loc, output_loc = generate_LPAT_config(start, target, carbon_track, allow_reversible, search_id)

    alg_output = subprocess.call(["java", "-jar",
        "searches/LinearPathwaySearch.jar", input_loc])
    print("alg_output", alg_output)
    if alg_output != 0:
        raise Exception("LPAT execution failed, check Celery worker logs.")
        return None

    converter_output = subprocess.call(["python", "searches/path_convert.py",
        "lpat", output_loc])
    print("converter_output", converter_output)
    if converter_output != 0:
        raise Exception("Converting LPAT output to visualization format failed, check Celery worker logs.")
        return None

    return output_loc


#
# Server Initialization
#

def load_examples():
    global searches

    examples_dir = "searches/examples"

    for f in os.listdir(examples_dir):
        if f.endswith(".txt"):
            search_id = f.split(".")[0]
            searches[search_id] = examples_dir + "/" + f


def load_existing_results():
    global searches

    output_dir = "searches/output"

    for f in os.listdir(output_dir):
        if f.endswith(".txt"):
            search_id = f.split(".")[0]
            searches[search_id] = output_dir + "/" + f


def initialize():
    """
    Runs when server is first started
    """
    global compound_names

    print "Initializing..."

    db = MySQLdb.connect(host="localhost", user="root", passwd="meta", db="metadb")
    cursor = db.cursor()
    cursor.execute("SELECT KEGGCompoundID, CompoundName from KEGGCompoundNames WHERE FirstName = 1;")


    for compound in cursor.fetchall():
        compound_names[compound[0]] = compound[1]

    cursor.close()
    db.close()

    for hub in ["C00022","C00047","C00024","C00083","C00025","C00026","C00448","C00033","C00058","C00037","C00043","C02557","C00041","C00235","C00167","C00341","C00048","C00129","C00044","C00064","C00223","C00353","C00097","C00062","C00052","C00051","C01054","C00036","C00084","C00049","C00132","C00124","C00065","C00128","C00091","C00100","C00074","C00079","C00082","C00090","C00096","C00157","C00073","C00086","C00119","C00219","C00078","C00111","C00085","C00103","C00121","C00180","C00099","C00169","C00042"]:
        hub_compounds[hub] = compound_names[hub]

    load_examples()
    load_existing_results()

initialize()
