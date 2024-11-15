# test_task_manager.py
import pytest
from flask import Flask
from task_manager import app, tasks_collection
from bson import ObjectId
from datetime import datetime


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client
    # Clean up the test data after each test
    tasks_collection.delete_many({})

def test_add_task(client):
    """Test creating a new task"""
    response = client.post('/api/tasks', json={
        'title': 'Test Task',
        'description': 'A task for testing',
        'priority': 'High'
    })
    data = response.get_json()
    assert response.status_code == 201
    assert data['message'] == 'Task created successfully'
    assert 'task' in data
    assert data['task']['title'] == 'Test Task'

def test_update_task(client):
    """Test updating an existing task"""
    # First, create a task
    task = tasks_collection.insert_one({
        'title': 'Initial Task',
        'description': 'An initial task description',
        'priority': 'Medium',
        'status': 'Pending',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    })
    task_id = str(task.inserted_id)
    
    # Now, update the task
    response = client.put(f'/api/tasks/{task_id}', json={
        'title': 'Updated Task',
        'description': 'Updated description',
        'priority': 'Low'
    })
    data = response.get_json()
    assert response.status_code == 200
    assert data['message'] == 'Task updated successfully'
    assert data['task']['title'] == 'Updated Task'
    assert data['task']['priority'] == 'Low'

def test_update_nonexistent_task(client):
    """Test updating a non-existent task"""
    fake_task_id = str(ObjectId())
    response = client.put(f'/api/tasks/{fake_task_id}', json={
        'title': 'Non-existent Task',
        'description': 'Should not be updated',
        'priority': 'Low'
    })
    data = response.get_json()
    assert response.status_code == 404
    assert data['error'] == 'Task not found'

def test_delete_task(client):
    """Test deleting an existing task"""
    # First, create a task
    task = tasks_collection.insert_one({
        'title': 'Task to be deleted',
        'description': 'Temporary task',
        'priority': 'Medium',
        'status': 'Pending',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    })
    task_id = str(task.inserted_id)
    
    # Now, delete the task
    response = client.delete(f'/api/tasks/{task_id}')
    data = response.get_json()
    assert response.status_code == 200
    assert data['message'] == 'Task deleted successfully'

def test_delete_nonexistent_task(client):
    """Test deleting a non-existent task"""
    fake_task_id = str(ObjectId())
    response = client.delete(f'/api/tasks/{fake_task_id}')
    data = response.get_json()
    assert response.status_code == 404
    assert data['error'] == 'Task not found'

if __name__ == "__main__":
    pytest.main(["-v", "test_taskManager.py"])
