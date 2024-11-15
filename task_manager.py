from flask import Flask, request, jsonify, send_from_directory
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from flask_cors import CORS
import os
import json
from datetime import datetime
from task import Task, Priority, Status  # This should now work with task.py in the same directory

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)
# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client.TaskManager
tasks_collection = db.Tasks

# JSON backup configuration
BACKUP_FILE = 'tasks.json'
def backup_to_json():
    """Backup all tasks to JSON file"""
    tasks = list(tasks_collection.find())
    for task in tasks:
        task['_id'] = str(task['_id'])
    
    with open(BACKUP_FILE, 'w') as f:
        json.dump(tasks, f, default=str)

def restore_from_json():
    """Restore tasks from JSON file if MongoDB is empty"""
    if tasks_collection.count_documents({}) == 0 and os.path.exists(BACKUP_FILE):
        with open(BACKUP_FILE, 'r') as f:
            tasks = json.load(f)
            for task in tasks:
                task['_id'] = ObjectId(task['_id'])
                tasks_collection.insert_one(task)

# Call restore on startup
restore_from_json()

@app.route('/api/tasks/load', methods=['GET'])
def load_tasks():
    try:
        if os.path.exists(BACKUP_FILE):
            with open(BACKUP_FILE, 'r') as f:
                tasks = json.load(f)
                for task in tasks:
                     task['_id'] = str(task['_id']) 
                return jsonify({'tasks': tasks})
        else:
            return jsonify({'tasks': list(tasks_collection.find())})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/save', methods=['POST'])
def save_tasks():
    try:
        tasks = request.get_json()['tasks']
        for task in tasks:
            task['_id'] = ObjectId(task['_id'])
        with open(BACKUP_FILE, 'w') as f:
            json.dump(tasks, f, default=str)
        return jsonify({'message': 'Tasks saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    



@app.route('/')
def serve_static():
    return send_from_directory('static', 'index.html')

#2)To view all the tasks 
@app.route('/api/tasks', methods=['GET'])
def view_tasks():
    try:
        status = request.args.get('status')
        priority = request.args.get('priority')
        sort_by = request.args.get('sort_by', 'priority')
        sort_order = int(request.args.get('sort_order', '-1'))
        
        query = {}
        if status:
            query['status'] = status
        if priority:
            query['priority'] = priority


        # Define sort key
        sort_key = {
            'priority': 'priority',
            'created': 'created_at',
            'updated': 'updated_at'
        }.get(sort_by, 'priority')

        # Priority-based sorting
        priority_order = {Priority.HIGH.value: 3, Priority.MEDIUM.value: 2, Priority.LOW.value: 1}
        tasks = list(tasks_collection.find(query).sort(sort_key, sort_order))
        
        # Sort by priority by default
        tasks.sort(key=lambda x: (
            priority_order[x['priority']],
            x['created_at']
        ), reverse=True)
        
        serialized_tasks = [serialize_task(task) for task in tasks]
        return jsonify({"tasks": serialized_tasks}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500 
    
@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    try:
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if task:
            return jsonify({"task": serialize_task(task)}), 200
        return jsonify({"error": "Task not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


#3)to update a task by id

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        task_data = request.get_json()
        
        validation_errors = validate_task_data(task_data, update=True)
        if validation_errors:
            return jsonify({"errors": validation_errors}), 400
        
        task_data['updated_at'] = datetime.utcnow()
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": task_data}
        )
        
        if result.modified_count:
            updated_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
            backup_to_json()  # Backup after update
            return jsonify({
                "message": "Task updated successfully",
                "task": serialize_task(updated_task)
            }), 200
        return jsonify({"error": "Task not found"}), 404
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>/complete', methods=['PATCH'])
def complete_task(task_id):
    try:
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": Status.COMPLETED.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            updated_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
            backup_to_json()  # Backup after completion
            return jsonify({
                "message": "Task marked as completed",
                "task": serialize_task(updated_task)
            }), 200
        return jsonify({"error": "Task not found"}), 404
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#1)To add a new task
@app.route('/api/tasks', methods=['POST'])
def add_task():
    try:
        task_data = request.get_json()
        
        validation_errors = validate_task_data(task_data)
        if validation_errors:
            return jsonify({"errors": validation_errors}), 400
        
        new_task = {
            "title": task_data['title'],
            "description": task_data['description'],
            "priority": task_data['priority'],
            "status": Status.PENDING.value,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = tasks_collection.insert_one(new_task)
        new_task['_id'] = str(result.inserted_id)
        
        backup_to_json()  # Backup after creation
        
        return jsonify({
            "message": "Task created successfully",
            "task": serialize_task(new_task)
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4)Delete the task
@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
        if result.deleted_count:
            backup_to_json()  # Backup after deletion
            return jsonify({"message": "Task deleted successfully"}), 200
        return jsonify({"error": "Task not found"}), 404
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

def serialize_task(task):
    task_dict = {
        '_id': str(task['_id']),
        'title': task['title'],
        'description': task['description'],
        'priority': task['priority'],
        'status': task['status'],
        'created_at': task['created_at'].isoformat() if isinstance(task['created_at'], datetime) else task['created_at'],
        'updated_at': task['updated_at'].isoformat() if isinstance(task['updated_at'], datetime) else task['updated_at']
    }
    return task_dict
def validate_task_data(data, update=False):
    """Validate task data"""
    errors = []
    required_fields = ['title', 'description', 'priority']
    
    if not update:  # Only check required fields for new tasks
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
    
    if 'priority' in data and data['priority'] not in [p.value for p in Priority]:
        errors.append("Invalid priority value")
    
    return errors

# Serve static files
@app.route('/')
def serve_frontend():
    return send_from_directory('frontend/static', 'index.html')

# Add error handler
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404


if __name__ == '__main__':
    # Ensure the MongoDB connection is working
    try:
        client.admin.command('ping')
        print("Successfully connected to MongoDB!")
        restore_from_json()  # Restore data from backup if needed
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
