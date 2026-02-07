"""
Validation functions for the AI generation module.
Provides comprehensive validation for questions, configurations, and user inputs.
"""

from typing import Dict, List, Any, Optional, Tuple
from .constants import (
    VALID_EXAMS, VALID_DIFFICULTIES, VALID_OPTIONS,
    MIN_QUESTIONS_PER_SUBJECT, MAX_QUESTIONS_PER_SUBJECT,
    MIN_QUESTION_LENGTH, MAX_QUESTION_LENGTH,
    MIN_OPTION_LENGTH, MAX_OPTION_LENGTH,
    MIN_SOLUTION_LENGTH, REQUIRED_QUESTION_FIELDS,
    REQUIRED_OPTION_KEYS
)
from .exceptions import (
    ValidationError, QuestionValidationError,
    InvalidExamTypeError, InvalidSubjectError,
    InvalidDifficultyError
)
from .exam_config import SYLLABUS


def validate_exam_type(exam: str) -> None:
    """
    Validate exam type.
    
    Args:
        exam: Exam type to validate
        
    Raises:
        InvalidExamTypeError: If exam type is invalid
    """
    if exam not in VALID_EXAMS:
        raise InvalidExamTypeError(exam, list(VALID_EXAMS))


def validate_subject(exam: str, subject: str) -> None:
    """
    Validate subject for given exam.
    
    Args:
        exam: Exam type
        subject: Subject to validate
        
    Raises:
        InvalidSubjectError: If subject is invalid for the exam
    """
    validate_exam_type(exam)
    valid_subjects = list(SYLLABUS.get(exam, {}).keys())
    if subject not in valid_subjects:
        raise InvalidSubjectError(subject, exam, valid_subjects)


def validate_difficulty(difficulty: str) -> None:
    """
    Validate difficulty level.
    
    Args:
        difficulty: Difficulty level to validate
        
    Raises:
        InvalidDifficultyError: If difficulty is invalid
    """
    if difficulty not in VALID_DIFFICULTIES:
        raise InvalidDifficultyError(difficulty, list(VALID_DIFFICULTIES))


def validate_num_questions(num_questions: int) -> None:
    """
    Validate number of questions.
    
    Args:
        num_questions: Number of questions to validate
        
    Raises:
        ValidationError: If number is out of valid range
    """
    if not isinstance(num_questions, int):
        raise ValidationError(
            f"num_questions must be an integer, got {type(num_questions).__name__}",
            field="num_questions",
            value=num_questions
        )
    
    if num_questions < MIN_QUESTIONS_PER_SUBJECT:
        raise ValidationError(
            f"num_questions must be at least {MIN_QUESTIONS_PER_SUBJECT}",
            field="num_questions",
            value=num_questions
        )
    
    if num_questions > MAX_QUESTIONS_PER_SUBJECT:
        raise ValidationError(
            f"num_questions cannot exceed {MAX_QUESTIONS_PER_SUBJECT}",
            field="num_questions",
            value=num_questions
        )


def validate_chapters(exam: str, subject: str, chapters: List[str]) -> None:
    """
    Validate chapters for given exam and subject.
    
    Args:
        exam: Exam type
        subject: Subject
        chapters: List of chapters to validate
        
    Raises:
        ValidationError: If chapters are invalid
    """
    validate_exam_type(exam)
    validate_subject(exam, subject)
    
    if not chapters:
        raise ValidationError(
            "Chapters list cannot be empty",
            field="chapters",
            value=chapters
        )
    
    valid_chapters = SYLLABUS.get(exam, {}).get(subject, [])
    invalid_chapters = [ch for ch in chapters if ch not in valid_chapters]
    
    if invalid_chapters:
        raise ValidationError(
            f"Invalid chapters for {exam} {subject}: {', '.join(invalid_chapters)}. "
            f"Valid chapters: {', '.join(valid_chapters)}",
            field="chapters",
            value=invalid_chapters
        )


def validate_question_structure(question: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate question structure.
    
    Args:
        question: Question dictionary to validate
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    # Check required fields
    missing_fields = [field for field in REQUIRED_QUESTION_FIELDS if field not in question]
    if missing_fields:
        errors.append(f"Missing required fields: {', '.join(missing_fields)}")
    
    # Validate question text
    if "question" in question:
        q_text = question["question"]
        if not isinstance(q_text, str):
            errors.append(f"Question must be a string, got {type(q_text).__name__}")
        elif len(q_text) < MIN_QUESTION_LENGTH:
            errors.append(f"Question too short (min {MIN_QUESTION_LENGTH} chars)")
        elif len(q_text) > MAX_QUESTION_LENGTH:
            errors.append(f"Question too long (max {MAX_QUESTION_LENGTH} chars)")
    
    # Validate options
    if "options" in question:
        options = question["options"]
        if not isinstance(options, dict):
            errors.append(f"Options must be a dictionary, got {type(options).__name__}")
        else:
            # Check all required options are present
            missing_opts = [opt for opt in REQUIRED_OPTION_KEYS if opt not in options]
            if missing_opts:
                errors.append(f"Missing options: {', '.join(missing_opts)}")
            
            # Validate each option
            for opt_key, opt_text in options.items():
                if opt_key not in VALID_OPTIONS:
                    errors.append(f"Invalid option key: {opt_key}")
                if not isinstance(opt_text, str):
                    errors.append(f"Option {opt_key} must be a string")
                elif len(opt_text) < MIN_OPTION_LENGTH:
                    errors.append(f"Option {opt_key} too short")
                elif len(opt_text) > MAX_OPTION_LENGTH:
                    errors.append(f"Option {opt_key} too long")
    
    # Validate correct answer
    if "correct" in question:
        correct = question["correct"]
        if correct not in VALID_OPTIONS:
            errors.append(f"Invalid correct answer: {correct}. Must be one of {VALID_OPTIONS}")
    
    # Validate solution
    if "solution" in question:
        solution = question["solution"]
        if not isinstance(solution, str):
            errors.append(f"Solution must be a string, got {type(solution).__name__}")
        elif len(solution) < MIN_SOLUTION_LENGTH:
            errors.append(f"Solution too short (min {MIN_SOLUTION_LENGTH} chars)")
    
    # Validate subject
    if "subject" in question:
        if not isinstance(question["subject"], str):
            errors.append("Subject must be a string")
    
    return len(errors) == 0, errors


def validate_question(question: Dict[str, Any], raise_on_error: bool = True) -> bool:
    """
    Validate a single question.
    
    Args:
        question: Question dictionary to validate
        raise_on_error: Whether to raise exception on validation failure
        
    Returns:
        True if valid, False otherwise
        
    Raises:
        QuestionValidationError: If validation fails and raise_on_error is True
    """
    is_valid, errors = validate_question_structure(question)
    
    if not is_valid and raise_on_error:
        raise QuestionValidationError(
            f"Question validation failed: {'; '.join(errors)}",
            question_id=question.get("id"),
            missing_fields=errors
        )
    
    return is_valid


def validate_questions_list(questions: List[Dict[str, Any]], min_count: Optional[int] = None) -> Tuple[int, int]:
    """
    Validate a list of questions.
    
    Args:
        questions: List of questions to validate
        min_count: Minimum number of valid questions required
        
    Returns:
        Tuple of (valid_count, invalid_count)
        
    Raises:
        ValidationError: If fewer than min_count questions are valid
    """
    valid_count = 0
    invalid_count = 0
    
    for question in questions:
        if validate_question(question, raise_on_error=False):
            valid_count += 1
        else:
            invalid_count += 1
    
    if min_count and valid_count < min_count:
        raise ValidationError(
            f"Insufficient valid questions: {valid_count}/{len(questions)} valid, need at least {min_count}",
            field="questions",
            value=valid_count
        )
    
    return valid_count, invalid_count


def validate_user_answer(answer: Optional[str]) -> bool:
    """
    Validate user answer.
    
    Args:
        answer: User's answer (A, B, C, D, or None)
        
    Returns:
        True if valid, False otherwise
    """
    if answer is None:
        return True  # Unattempted is valid
    return answer in VALID_OPTIONS


def validate_subject_config(exam: str, subject_data: Dict[str, Any]) -> None:
    """
    Validate subject configuration.
    
    Args:
        exam: Exam type
        subject_data: Dictionary containing subject configuration
        
    Raises:
        ValidationError: If configuration is invalid
    """
    required_keys = ["chapters", "num_questions", "difficulty"]
    missing_keys = [key for key in required_keys if key not in subject_data]
    
    if missing_keys:
        raise ValidationError(
            f"Missing required keys in subject config: {', '.join(missing_keys)}",
            field="subject_config"
        )
    
    validate_num_questions(subject_data["num_questions"])
    validate_difficulty(subject_data["difficulty"])
    # Note: chapters validation requires subject name, done separately


def sanitize_text(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize text by removing excessive whitespace and limiting length.
    
    Args:
        text: Text to sanitize
        max_length: Optional maximum length
        
    Returns:
        Sanitized text
    """
    # Remove excessive whitespace
    text = " ".join(text.split())
    
    # Limit length if specified
    if max_length and len(text) > max_length:
        text = text[:max_length].rsplit(' ', 1)[0] + "..."
    
    return text.strip()
