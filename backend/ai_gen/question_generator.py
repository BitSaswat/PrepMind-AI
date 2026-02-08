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

    # Import syllabus for default chapters
    from .exam_config import SYLLABUS

    # Pre-process subject data: if chapters is empty, use all chapters
    for subject, data in subject_data.items():
        if not data.get("chapters"):
            logger.info(f"No chapters specified for {subject}, using full syllabus")
            if exam in SYLLABUS and subject in SYLLABUS[exam]:
                data["chapters"] = SYLLABUS[exam][subject]
    
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
    


    # Validate all subject configurations first
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
    # Add buffer to account for validation failures
    # Request more questions than needed, then select the best ones
    SAFETY_BUFFER = 5  # Request 5 extra questions
    questions_to_request = num_questions + SAFETY_BUFFER
    
    logger.info(f"Generating {num_questions} questions for {subject} (requesting {questions_to_request} with buffer)")
    
    # Build prompt
    prompt = PROMPT_TEMPLATE.format(
        exam=exam,
        subject=subject,
        chapters=", ".join(chapters),
        num_questions=questions_to_request,  # Request with buffer
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
            expected_count=questions_to_request,  # Expect buffer amount
            strict=False  # Don't fail if we get fewer questions
        )
    except Exception as e:
        logger.error(f"Parsing failed for {subject}: {str(e)}")
        raise ValidationError(
            f"Failed to parse questions for {subject}: {str(e)}",
            field="parsing"
        )
    
    # Select the best questions up to the requested count
    if len(questions) > num_questions:
        logger.info(f"Got {len(questions)} questions, selecting best {num_questions}")
        questions = questions[:num_questions]
    elif len(questions) < num_questions:
        logger.warning(
            f"Insufficient questions after validation: expected {num_questions}, got {len(questions)}. "
            f"Buffer helped but still short."
        )
    
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
