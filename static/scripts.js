const API_URL = '/api'; 
let tasks = [];
async function fetchTasks() {
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        
        let url = `${API_URL}/tasks?sort_by=priority&sort_order=-1`;
        if (statusFilter) url += `&status=${statusFilter}`;
        if (priorityFilter) url += `&priority=${priorityFilter}`;
        
        const response = await fetch(url);
        const data = await response.json();
        tasks = data.tasks;
        renderTasks();
    } catch (error) {
        showToast('Error fetching tasks', 'error');
    }
}
//to save tasks to file
async function saveTasks() {
    try {
        await fetch(`${API_URL}/tasks/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks })
        });
        showToast('Tasks saved successfully', 'success');
    } catch (error) {
        showToast('Error saving tasks', 'error');
    }
}
function filterAndSortTasks() {
    fetchTasks();
}
function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-tasks">No tasks found</div>';
        return;
    }
    
    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.status === 'Completed' ? 'completed' : ''}`;
        taskCard.setAttribute('data-task-id', task._id); // Add this line
        
        taskCard.innerHTML = `
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            </div>
            <p class="task-description">${task.description}</p>
            <div class="task-meta">
                <span>ID: <span class="task-id">${task._id}</span></span> <!-- Add this line -->
                <span class="task-status">${task.status}</span>
                <div class="task-actions">
                    ${task.status !== 'Completed' ? 
                        `<button onclick="markTaskCompleted('${task._id}')" class="action-btn">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                </div>
            </div>
        `;
        
        container.appendChild(taskCard);
    });
}
function showTaskDetails(task) {
    const modal = document.getElementById('taskDetailsModal');
    document.getElementById('detailsId').textContent = task._id;
    document.getElementById('detailsTitle').textContent = task.title;
    document.getElementById('detailsDescription').textContent = task.description;
    document.getElementById('detailsPriority').innerHTML = `<span class="priority-badge priority-${task.priority}">${task.priority}</span>`;
    document.getElementById('detailsStatus').textContent = task.status;
    document.getElementById('detailsCreated').textContent = formatDate(task.created_at);
    document.getElementById('detailsUpdated').textContent = formatDate(task.updated_at);
    modal.style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('taskDetailsModal').style.display = 'none';
}
// Open the modal
function openModal() {
    document.getElementById('taskModal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
}
// Close the modal
function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}
// Add or edit a task
async function handleSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('taskId').value;
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const prioritySelected = document.querySelector('input[name="priority"]:checked');
    // Validate title and description
    let isValid = true;
    if (title.trim().length === 0) {
        document.getElementById('titleError').textContent = 'Title is required';
        isValid = false;
    } else if (title.length > 50) {
        document.getElementById('titleError').textContent = 'Title cannot exceed 50 characters';
        isValid = false;
    } else {
        document.getElementById('titleError').textContent = '';
    }
    if (description.trim().length === 0) {
        document.getElementById('descriptionError').textContent = 'Description is required';
        isValid = false;
    } else if (description.length > 250) {
        document.getElementById('descriptionError').textContent = 'Description cannot exceed 250 characters';
        isValid = false;
    } else {
        document.getElementById('descriptionError').textContent = '';
    }
    if (!validatePriority()) {
        isValid = false;
    }
    if (!isValid) {
        return;
    }
    const task = { title, description,  priority: prioritySelected.value };
    try {
        let response;
        const url = id ? `${API_URL}/tasks/${id}` : `${API_URL}/tasks`;
        const method = id ? 'PUT' : 'POST';
        response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        });
        const data = await response.json();
        if (response.ok) {
            closeModal();
            showToast(data.message || 'Task saved successfully', 'success');
            fetchTasks();
        } else {
            showToast(data.error || 'Error saving task', 'error');
        }
    } catch (error) {
        showToast('Error saving task', 'error');
    }
    if (typeof saveTasks === 'function') {
        await saveTasks();
    }
}
// Delete a task
async function deleteTask(id) {
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            fetchTasks();
        } else {
            showToast(data.error || 'Error deleting task', 'error');
        }
    } catch (error) {
        showToast('Error deleting task', 'error');
    }
}
// Mark task as completed
async function markTaskCompleted(id) {
    try {
        const response = await fetch(`${API_URL}/tasks/status/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'Completed'
            })
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            fetchTasks();
        } else {
            showToast(data.error || 'Error updating task', 'error');
        }
    } catch (error) {
        showToast('Error updating task', 'error');
    }
    await saveTasks();
}
// Edit task
async function editTask(event) {
    const taskCard = event.currentTarget.closest('.task-card');
    const taskId = taskCard.getAttribute('data-task-id');
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`);
        const data = await response.json();
        
        if (response.ok) {
            const task = data.task;
            document.getElementById('taskId').value = task._id;
            document.getElementById('title').value = task.title;
            document.getElementById('description').value = task.description;
            //document.getElementById('priority').value = task.priority;
            // Set the correct priority radio button
            const priorityInput = document.querySelector(`input[name="priority"][value="${task.priority}"]`);
            if (priorityInput) {
                priorityInput.checked = true;
            }
           
            document.getElementById('modalTitle').textContent = 'Edit Task';
            openModal();
        } else {
            showToast(data.error || 'Error fetching task', 'error');
        }
    } catch (error) {
        showToast('Error fetching task', 'error');
    }
}
// Filter tasks
function filterTasks() {
    renderTasks();
}
// Show toast notification
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}
// Add this to scripts.js
// Update fetchTasks to include sorting

// Update the markTaskCompleted function
async function markTaskCompleted(id) {
    try {
        const response = await fetch(`${API_URL}/tasks/${id}/complete`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        showToast(data.message, 'success');
        fetchTasks();
    } catch (error) {
        showToast('Error updating task', 'error');
    }
}
// Initialize and fetch tasks on page load
document.addEventListener('DOMContentLoaded', fetchTasks);
// Close modals when clicking outside
window.onclick = function(event) {
    const taskModal = document.getElementById('taskModal');
    const detailsModal = document.getElementById('taskDetailsModal');
    if (event.target === taskModal) {
        closeModal();
    }
    if (event.target === detailsModal) {
        closeDetailsModal();
    }
}


let currentUpdateId = null;
async function openUpdateByIdModal() {
    document.getElementById('updateByIdModal').style.display = 'flex';
    document.getElementById('updateFormFields').style.display = 'none';
    document.getElementById('updateByIdForm').reset();
    currentUpdateId = null;
}
function closeUpdateByIdModal() {
    document.getElementById('updateByIdModal').style.display = 'none';
    resetUpdateForm();
}
function resetUpdateForm() {
    document.getElementById('updateByIdForm').reset();
    document.getElementById('updateFormFields').style.display = 'none';
    currentUpdateId = null;
    // Remove highlighting from all task cards
    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.remove('updating');
    });
}
async function fetchTaskById() {
    const taskId = document.getElementById('updateTaskId').value.trim();
    if (!taskId) {
        showToast('Please enter a task ID', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`);
        const data = await response.json();
        if (response.ok) {
            const task = data.task;
            currentUpdateId = task._id;      
            document.getElementById('updateTitle').value = task.title;
            document.getElementById('updateDescription').value = task.description;
            document.getElementById('updatePriority').value = task.priority;
            document.getElementById('updateStatus').value = task.status;     
            document.getElementById('updateFormFields').style.display = 'block';
            document.querySelectorAll('.task-card').forEach(card => {
                card.classList.remove('updating');
                if (card.dataset.taskId === taskId) {
                    card.classList.add('updating');
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        } else {
            showToast(data.error || 'Task not found', 'error');
        }
    } catch (error) {
        showToast('Error fetching task', 'error');
    }
}
async function handleUpdateById(event) {
    event.preventDefault();
    if (!currentUpdateId) {
        showToast('Please fetch a task first', 'error');
        return;
    }
    const updateData = {
        title: document.getElementById('updateTitle').value,
        description: document.getElementById('updateDescription').value,
        priority: document.getElementById('updatePriority').value,
        status: document.getElementById('updateStatus').value
    };
    try {
        const response = await fetch(`${API_URL}/tasks/${currentUpdateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
            closeUpdateByIdModal();
            await fetchTasks();
            await saveTasks();
        } else {
            showToast(data.error || 'Error updating task', 'error');
        }
    } catch (error) {
        showToast('Error updating task', 'error');
    }
}
function openDeleteByIdModal() {
    document.getElementById('deleteByIdModal').style.display = 'flex';
    document.getElementById('deleteByIdForm').reset();
}
function closeDeleteByIdModal() {
    document.getElementById('deleteByIdModal').style.display = 'none';
}
async function deleteTaskById() {
    const taskId = document.getElementById('deleteTaskId').value.trim();
    if (!isValidObjectId(taskId)) {
        showToast('Please enter a task ID', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            closeDeleteByIdModal();
            fetchTasks();
            await saveTasks();
        } else {
            showToast(data.error || 'Error deleting task', 'error');
        }
    } catch (error) {
        showToast('Error deleting task', 'error');
    }
    
}function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}
function handleDeleteById(event) {
    event.preventDefault();
    deleteTaskById();
}
function copyTaskId(taskId) {
    navigator.clipboard.writeText(taskId).then(() => {
        const tooltip = document.createElement('div');
        tooltip.className = 'copied-tooltip';
        tooltip.textContent = 'Copied!';
        document.body.appendChild(tooltip);
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const rect = taskElement.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX + taskElement.offsetWidth / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => tooltip.remove(), 500); 
        }, 1500);
    }).catch(() => {
        showToast('Failed to copy task ID', 'error');
    });
}
function validatePriority() {
    const priorityInputs = document.querySelectorAll('input[name="priority"]');
    let isSelected = false;
    priorityInputs.forEach(input => {
        if (input.checked) {
            isSelected = true;
        }
    });
    
    const errorElement = document.getElementById('priorityError');
    if (!isSelected) {
        errorElement.textContent = 'Please select a priority level';
        return false;
    }
    errorElement.textContent = '';
    return true;
}
document.addEventListener('DOMContentLoaded', fetchTasks);


