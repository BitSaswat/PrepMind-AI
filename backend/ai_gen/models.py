"""
Data models for the AI generation module using dataclasses.
Provides type-safe structures for questions, configurations, and results.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
from enum import Enum


class ExamType(str, Enum):
    """Enum for exam types."""
    JEE = "JEE"
    NEET = "NEET"


class Difficulty(str, Enum):
    """Enum for difficulty levels."""
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class AnswerOption(str, Enum):
    """Enum for answer options."""
    A = "A"
    B = "B"
    C = "C"
    D = "D"


@dataclass
class Question:
    """Represents a single MCQ question."""
    id: int
    subject: str
    question: str
    options: Dict[str, str]
    correct: str
    solution: str
    chapter: Optional[str] = None
    difficulty: Optional[str] = None
    marks: int = 4
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def validate(self) -> bool:
        """Validate question structure."""
        from .validators import validate_question
        return validate_question(self.to_dict())
    
    def __post_init__(self):
        """Validate after initialization."""
        if not isinstance(self.options, dict):
            raise ValueError("Options must be a dictionary")
        if self.correct not in ["A", "B", "C", "D"]:
            raise ValueError(f"Invalid correct answer: {self.correct}")
        if len(self.options) != 4:
            raise ValueError(f"Must have exactly 4 options, got {len(self.options)}")


@dataclass
class SubjectConfig:
    """Configuration for generating questions for a subject."""
    subject: str
    chapters: List[str]
    num_questions: int
    difficulty: str = "Medium"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def __post_init__(self):
        """Validate after initialization."""
        if self.num_questions < 1:
            raise ValueError("num_questions must be at least 1")
        if not self.chapters:
            raise ValueError("chapters list cannot be empty")


@dataclass
class ExamConfig:
    """Configuration for exam generation."""
    exam_type: ExamType
    subjects: List[SubjectConfig]
    total_duration: Optional[int] = 180  # minutes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "exam_type": self.exam_type.value,
            "subjects": [s.to_dict() for s in self.subjects],
            "total_duration": self.total_duration
        }
    
    def get_total_questions(self) -> int:
        """Get total number of questions across all subjects."""
        return sum(s.num_questions for s in self.subjects)


@dataclass
class QuestionAttempt:
    """Represents a user's attempt at a question."""
    question_id: int
    user_answer: Optional[str]
    time_taken: Optional[float] = None  # seconds
    is_marked_for_review: bool = False
    
    def is_correct(self, correct_answer: str) -> bool:
        """Check if the answer is correct."""
        return self.user_answer == correct_answer
    
    def is_attempted(self) -> bool:
        """Check if question was attempted."""
        return self.user_answer is not None


@dataclass
class SubjectResult:
    """Results for a single subject."""
    subject: str
    total_questions: int
    attempted: int
    correct: int
    wrong: int
    unattempted: int
    marks_obtained: float
    max_marks: float
    accuracy: float = field(init=False)
    
    def __post_init__(self):
        """Calculate derived fields."""
        if self.attempted > 0:
            self.accuracy = (self.correct / self.attempted) * 100
        else:
            self.accuracy = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class EvaluationResult:
    """Complete evaluation result for a test."""
    total_marks: float
    positive_marks: float
    negative_marks: float
    total_questions: int
    attempted: int
    correct: int
    wrong: int
    unattempted: int
    accuracy: float
    subject_results: List[SubjectResult]
    question_details: List[Dict[str, Any]]
    time_taken: Optional[float] = None  # seconds
    percentile: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_marks": self.total_marks,
            "positive_marks": self.positive_marks,
            "negative_marks": self.negative_marks,
            "total_questions": self.total_questions,
            "attempted": self.attempted,
            "correct": self.correct,
            "wrong": self.wrong,
            "unattempted": self.unattempted,
            "accuracy": self.accuracy,
            "subject_results": [s.to_dict() for s in self.subject_results],
            "question_details": self.question_details,
            "time_taken": self.time_taken,
            "percentile": self.percentile
        }
    
    def get_subject_result(self, subject: str) -> Optional[SubjectResult]:
        """Get result for a specific subject."""
        for result in self.subject_results:
            if result.subject == subject:
                return result
        return None


@dataclass
class MarkingScheme:
    """Marking scheme for an exam."""
    correct: int = 4
    wrong: int = -1
    unattempted: int = 0
    
    def calculate_marks(self, correct_count: int, wrong_count: int, unattempted_count: int) -> float:
        """Calculate total marks based on counts."""
        return (correct_count * self.correct) + (wrong_count * self.wrong) + (unattempted_count * self.unattempted)
    
    def to_dict(self) -> Dict[str, int]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class GenerationMetadata:
    """Metadata about question generation."""
    exam_type: str
    total_questions: int
    subjects: List[str]
    generation_time: float  # seconds
    model_used: str
    temperature: float
    success_rate: float  # percentage of successfully parsed questions
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
