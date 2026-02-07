"""
Question generator for creating exam questions using LLM.
Handles multi-subject generation with validation and error handling.
"""

import time
from typing import Dict, List, Any, Tuple

from .llm_service import call_llm
from .prompt import PROMPT_TEMPLATE
from .question_parser import parse_llm_output
from .logger import get_logger
from .validators import (
    validate_exam_type, validate_subject,
    validate_num_questions, validate_difficulty,
    validate_chapters
)
from .exceptions import ValidationError, InsufficientQuestionsError

# Initialize logger
logger = get_logger("question_generator")


def generate_questions(
    exam: str,
    subject_data: Dict[str, Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
    """
    Generate questions for multiple subjects.
    
    Args:
        exam: Exam type (JEE/NEET)
        subject_data: Dictionary mapping subject names to their configurations
            Each config should have: chapters, num_questions, difficulty
            
    Returns:
        Tuple of (all_questions, questions_by_subject)
        
    Raises:
        ValidationError: If input validation fails
        InsufficientQuestionsError: If not enough questions are generated
    """
    logger.info(f"Starting question generation for {exam}")
    logger.info(f"Subjects: {', '.join(subject_data.keys())}")
    
    # Validate exam type
    validate_exam_type(exam)
    
    # Validate all subject configurations first
    for subject, data in subject_data.items():
        try:
            validate_subject(exam, subject)
            validate_num_questions(data["num_questions"])
            validate_difficulty(data["difficulty"])
            validate_chapters(exam, subject, data["chapters"])
        except Exception as e:
            logger.error(f"Validation failed for {subject}: {str(e)}")
            raise
    
    all_questions = []
    by_subject = {}
    question_id = 0
    total_start_time = time.time()
    
    # Generate questions for each subject
    for subject, data in subject_data.items():
        logger.info(f"Generating {data['num_questions']} questions for {subject}")
        subject_start_time = time.time()
        
        try:
            # Generate questions for this subject
            questions = _generate_subject_questions(
                exam=exam,
                subject=subject,
                chapters=data["chapters"],
                num_questions=data["num_questions"],
                difficulty=data["difficulty"]
            )
            
            subject_duration = time.time() - subject_start_time
            logger.info(
                f"Generated {len(questions)} questions for {subject} "
                f"in {subject_duration:.2f}s"
            )
            
            # Assign IDs and collect questions
            by_subject[subject] = []
            for question in questions:
                question["id"] = question_id
                question_id += 1
                all_questions.append(question)
                by_subject[subject].append(question)
            
            # Check if we got enough questions
            if len(questions) < data["num_questions"]:
                logger.warning(
                    f"Insufficient questions for {subject}: "
                    f"requested {data['num_questions']}, got {len(questions)}"
                )
        
        except Exception as e:
            logger.error(f"Failed to generate questions for {subject}: {str(e)}")
            # Continue with other subjects instead of failing completely
            by_subject[subject] = []
            logger.warning(f"Skipping {subject} due to error")
    
    total_duration = time.time() - total_start_time
    logger.info(
        f"Question generation complete: {len(all_questions)} total questions "
        f"in {total_duration:.2f}s"
    )
    
    # Final validation
    if not all_questions:
        raise InsufficientQuestionsError(
            requested=sum(data["num_questions"] for data in subject_data.values()),
            generated=0
        )
    
    return all_questions, by_subject


def _generate_subject_questions(
    exam: str,
    subject: str,
    chapters: List[str],
    num_questions: int,
    difficulty: str
) -> List[Dict[str, Any]]:
    """
    Generate questions for a single subject.
    
    Args:
        exam: Exam type
        subject: Subject name
        chapters: List of chapters to cover
        num_questions: Number of questions to generate
        difficulty: Difficulty level
        
    Returns:
        List of generated questions
        
    Raises:
        ValidationError: If generation fails
    """
    # Build prompt
    prompt = PROMPT_TEMPLATE.format(
        exam=exam,
        subject=subject,
        chapters=", ".join(chapters),
        num_questions=num_questions,
        difficulty=difficulty
    )
    
    logger.debug(f"Prompt length: {len(prompt)} chars")
    
    # Call LLM
    try:
        raw_output = call_llm(prompt)
        logger.debug(f"LLM response length: {len(raw_output)} chars")
    except Exception as e:
        logger.error(f"LLM call failed for {subject}: {str(e)}")
        raise ValidationError(
            f"Failed to generate questions for {subject}: {str(e)}",
            field="llm_call"
        )
    
    # Parse output
    try:
        questions = parse_llm_output(
            text=raw_output,
            subject=subject,
            expected_count=num_questions,
            strict=False  # Don't fail if we get fewer questions
        )
    except Exception as e:
        logger.error(f"Parsing failed for {subject}: {str(e)}")
        raise ValidationError(
            f"Failed to parse questions for {subject}: {str(e)}",
            field="parsing"
        )
    
    # Limit to requested count (take best ones if we got more)
    if len(questions) > num_questions:
        logger.info(f"Got {len(questions)} questions, limiting to {num_questions}")
        questions = questions[:num_questions]
    
    # Add metadata
    for question in questions:
        question["difficulty"] = difficulty
        question["chapter"] = chapters[0] if chapters else None  # Assign first chapter
    
    return questions


def generate_single_subject(
    exam: str,
    subject: str,
    chapters: List[str],
    num_questions: int = 30,
    difficulty: str = "Medium"
) -> List[Dict[str, Any]]:
    """
    Convenience function to generate questions for a single subject.
    
    Args:
        exam: Exam type (JEE/NEET)
        subject: Subject name
        chapters: List of chapters
        num_questions: Number of questions to generate
        difficulty: Difficulty level
        
    Returns:
        List of generated questions
    """
    subject_data = {
        subject: {
            "chapters": chapters,
            "num_questions": num_questions,
            "difficulty": difficulty
        }
    }
    
    all_questions, _ = generate_questions(exam, subject_data)
    return all_questions
