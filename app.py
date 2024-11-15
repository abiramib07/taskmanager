from flask import Flask
from pymongo import MongoClient
import os

def create_app():
    app = Flask(__name__)

    # MongoDB Configuration
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    client = MongoClient(MONGO_URI)
    db = client.TaskManager
    global tasks_collection
    tasks_collection = db.Tasks

    # Ensure MongoClient closes properly
    @app.teardown_appcontext
    def close_db(error):
        if client:
            client.close()

    # Define your routes here
    @app.route('/')
    def home():
        return "Welcome to Task Manager!"

    return app
