# task.py
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional

class Priority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class Status(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"

@dataclass
class Task:
    title: str
    description: str
    priority: Priority
    status: Status = Status.PENDING
    created_at: datetime = None
    updated_at: datetime = None
    id: Optional[str] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = self.created_at

    def mark_as_complete(self):
        self.status = Status.COMPLETED
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }