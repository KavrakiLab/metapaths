from flask import Flask, render_template
app = Flask(__name__)

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
