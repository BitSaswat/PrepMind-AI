"""
AI Generation Module for PrepMind AI.

This module provides comprehensive question generation, parsing, evaluation,
and PDF generation capabilities for JEE and NEET mock tests.

Main Components:
- llm_service: LLM API interaction with retry logic
- question_generator: Multi-subject question generation
- question_parser: Robust parsing of LLM outputs
- evaluation: Comprehensive test evaluation and analytics
- pdf_utils: PDF generation for questions and answers
- validators: Input validation utilities
- models: Type-safe data models
- exam_config: Exam and syllabus configuration
- prompt: Enhanced prompt templates
- logger: Logging infrastructure
- exceptions: Custom exception hierarchy
- constants: Centralized configuration

Usage Example:
    from ai_gen import generate_questions, evaluate, generate_question_pdf
    
    # Generate questions
    subject_data = {
        "Physics": {
            "chapters": ["Kinematics", "Laws of Motion"],
            "num_questions": 10,
            "difficulty": "Medium"
        }
    }
    questions, by_subject = generate_questions("JEE", subject_data)
    
    # Evaluate answers
    user_answers = {0: "A", 1: "B", 2: None}  # question_id: answer
    result = evaluate(questions, user_answers, "JEE")
    
    # Generate PDF
    pdf_buffer = generate_question_pdf(by_subject, "JEE Mock Test")
"""

__version__ = "2.0.0"
__author__ = "PrepMind AI Team"

# Import main functions for easy access
from .question_generator import generate_questions, generate_single_subject
from .evaluation import evaluate, get_performance_insights, calculate_percentile
from .pdf_utils import generate_question_pdf, generate_answer_pdf
from .llm_service import call_llm, get_llm_service
from .exam_config import (
    SYLLABUS, MARKING_SCHEME, DIFFICULTY_LEVELS,
    get_subjects, get_chapters, get_marking_scheme,
    is_valid_exam, is_valid_subject, is_valid_chapter
)

# Import models for type hints
from .models import (
    Question, SubjectConfig, ExamConfig, QuestionAttempt,
    SubjectResult, EvaluationResult, MarkingScheme,
    ExamType, Difficulty, AnswerOption
)

# Import validators
from .validators import (
    validate_exam_type, validate_subject, validate_difficulty,
    validate_num_questions, validate_chapters, validate_question
)

# Import exceptions
from .exceptions import (
    AIGenException, LLMServiceError, ParsingError, ValidationError,
    QuestionValidationError, ConfigurationError, PDFGenerationError
)

__all__ = [
    # Main functions
    "generate_questions",
    "generate_single_subject",
    "evaluate",
    "get_performance_insights",
    "calculate_percentile",
    "generate_question_pdf",
    "generate_answer_pdf",
    "call_llm",
    "get_llm_service",
    
    # Configuration
    "SYLLABUS",
    "MARKING_SCHEME",
    "DIFFICULTY_LEVELS",
    "get_subjects",
    "get_chapters",
    "get_marking_scheme",
    "is_valid_exam",
    "is_valid_subject",
    "is_valid_chapter",
    
    # Models
    "Question",
    "SubjectConfig",
    "ExamConfig",
    "QuestionAttempt",
    "SubjectResult",
    "EvaluationResult",
    "MarkingScheme",
    "ExamType",
    "Difficulty",
    "AnswerOption",
    
    # Validators
    "validate_exam_type",
    "validate_subject",
    "validate_difficulty",
    "validate_num_questions",
    "validate_chapters",
    "validate_question",
    
    # Exceptions
    "AIGenException",
    "LLMServiceError",
    "ParsingError",
    "ValidationError",
    "QuestionValidationError",
    "ConfigurationError",
    "PDFGenerationError",
]
