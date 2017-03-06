from flask import Flask, render_template
app = Flask(__name__)


# Global dictionary for storing metapath search results
# graph_id : results object
graphs = {}

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
