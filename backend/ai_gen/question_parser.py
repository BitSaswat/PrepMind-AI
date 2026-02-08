"""
Question parser for extracting structured questions from LLM output.
Provides robust parsing with multiple strategies and comprehensive validation.
"""

import re
from typing import List, Dict, Any, Optional, Tuple

from .logger import get_logger
from .constants import (
    QUESTION_PATTERN, ANSWER_PATTERN, SOLUTION_PATTERN,
    OPTION_PATTERN, MIN_PARSE_SUCCESS_RATE, NUMERICAL_ANSWER_PATTERN
)
from .exceptions import ParsingError, InsufficientQuestionsError
from .validators import validate_question, sanitize_text

# Initialize logger
logger = get_logger("question_parser")


def parse_llm_output(
    text: str,
    subject: str,
    expected_count: Optional[int] = None,
    strict: bool = False
) -> List[Dict[str, Any]]:
    """
    Parse LLM output into structured questions.
    
    Args:
        text: Raw LLM output text
        subject: Subject name for the questions
        expected_count: Expected number of questions
        strict: If True, raise error if parsing success rate is low
        
    Returns:
        List of parsed question dictionaries
        
    Raises:
        ParsingError: If parsing fails completely
        InsufficientQuestionsError: If not enough questions are parsed
    """
    logger.info(f"Starting to parse LLM output for {subject} ({len(text)} chars)")
    
    if not text or not text.strip():
        logger.error("Empty LLM output received")
        raise ParsingError("Empty LLM output", raw_text=text, subject=subject)
    
    # Try primary parsing strategy
    try:
        questions = _parse_with_regex(text, subject)
        logger.info(f"Primary parsing extracted {len(questions)} questions")
    except Exception as e:
        logger.warning(f"Primary parsing failed: {str(e)}, trying fallback")
        questions = _parse_with_fallback(text, subject)
        logger.info(f"Fallback parsing extracted {len(questions)} questions")
    
    if not questions:
        logger.error(f"No questions could be parsed from output")
        raise ParsingError(
            "Failed to parse any questions from LLM output",
            raw_text=text,
            subject=subject
        )
    
    # HARD TRUNCATION: Immediately limit to expected count to prevent over-processing
    # This enforces the count limit at the earliest possible stage
    if expected_count and len(questions) > expected_count:
        logger.warning(
            f"Truncating parsed questions: got {len(questions)}, limiting to {expected_count}"
        )
        questions = questions[:expected_count]
    
    # Validate and filter questions
    valid_questions = []
    invalid_count = 0
    
    for i, question in enumerate(questions):
        question["id"] = i  # Assign temporary ID
        question["subject"] = subject
        
        try:
            if validate_question(question, raise_on_error=False):
                valid_questions.append(question)
            else:
                invalid_count += 1
                logger.warning(f"Question {i} failed validation")
        except Exception as e:
            invalid_count += 1
            logger.warning(f"Question {i} validation error: {str(e)}")
    
    logger.info(f"Validation complete: {len(valid_questions)} valid, {invalid_count} invalid")
    
    # Check success rate
    total_parsed = len(questions)
    success_rate = len(valid_questions) / total_parsed if total_parsed > 0 else 0
    
    if strict and success_rate < MIN_PARSE_SUCCESS_RATE:
        raise ParsingError(
            f"Low parsing success rate: {success_rate:.1%} (threshold: {MIN_PARSE_SUCCESS_RATE:.1%})",
            raw_text=text,
            subject=subject
        )
    
    # Check if we have enough questions
    if expected_count and len(valid_questions) < expected_count:
        logger.warning(
            f"Insufficient questions: expected {expected_count}, got {len(valid_questions)}"
        )
        if strict:
            raise InsufficientQuestionsError(
                requested=expected_count,
                generated=len(valid_questions),
                subject=subject
            )
    
    return valid_questions


def _parse_with_regex(text: str, subject: str) -> List[Dict[str, Any]]:
    """
    Parse questions using regex patterns.
    
    Args:
        text: Raw text to parse
        subject: Subject name
        
    Returns:
        List of parsed questions
    """
    # Split into question blocks
    blocks = re.split(QUESTION_PATTERN, text.strip())
    blocks = [b.strip() for b in blocks if b.strip()]
    
    questions = []
    
    for i, block in enumerate(blocks):
        try:
            question = _parse_question_block(block, i)
            if question:
                questions.append(question)
        except Exception as e:
            logger.debug(f"Failed to parse block {i}: {str(e)}")
            continue
    
    return questions


def _parse_question_block(block: str, index: int) -> Optional[Dict[str, Any]]:
    """
    Parse a single question block.
    
    Args:
        block: Text block containing one question
        index: Question index
        
    Returns:
        Parsed question dictionary or None if parsing fails
    """
    # Extract answer
    answer_match = re.search(ANSWER_PATTERN, block, re.IGNORECASE)
    numerical_match = None
    question_type = "mcq"
    
    if answer_match:
        correct_answer = answer_match.group(1).upper()
    else:
        # Check for numerical answer
        numerical_match = re.search(NUMERICAL_ANSWER_PATTERN, block, re.IGNORECASE)
        if numerical_match:
            try:
                # Round to nearest integer if decimal, though regex enforces integer-like format
                # But typically our prompt asks for integer
                correct_answer = int(float(numerical_match.group(1))) # Robust against "42.0"
                question_type = "numerical"
            except ValueError:
                correct_answer = None
        else:
            correct_answer = None
    
    # Extract solution
    solution_match = re.search(SOLUTION_PATTERN, block, re.IGNORECASE | re.DOTALL)
    solution = solution_match.group(1).strip() if solution_match else ""
    
    # Remove answer and solution from block to extract question and options
    clean_block = block
    if answer_match:
        clean_block = clean_block[:answer_match.start()] + clean_block[answer_match.end():]
    elif numerical_match:
        clean_block = clean_block[:numerical_match.start()] + clean_block[numerical_match.end():]
        
    if solution_match:
        clean_block = clean_block[:solution_match.start()] + clean_block[solution_match.end():]
    
    # Extract options (only for MCQ)
    options = {}
    if question_type == "mcq":
        for opt in ["A", "B", "C", "D"]:
            pattern = OPTION_PATTERN.format(opt=opt)
            match = re.search(pattern, clean_block, re.IGNORECASE)
            if match:
                option_text = match.group(1).strip()
                # Remove this option from the block
                clean_block = clean_block[:match.start()] + clean_block[match.end():]
                options[opt] = sanitize_text(option_text)
    
    # Extract question text (what's left after removing options)
    lines = [line.strip() for line in clean_block.split('\n') if line.strip()]
    question_text = ""
    
    for line in lines:
        # Skip lines that look like question numbers
        if re.match(r'^Q\d+\.?\s*', line, re.IGNORECASE):
            line = re.sub(r'^Q\d+\.?\s*', '', line, flags=re.IGNORECASE)
        if line and not line.startswith(('Answer:', 'Solution:')):
            question_text = line
            break
    
    if not question_text:
        return None
    
    return {
        "id": index,
        "subject": "",  # Will be set by caller
        "type": question_type,
        "question": sanitize_text(question_text),
        "options": options if question_type == "mcq" else None,
        "correct": correct_answer,
        "solution": sanitize_text(solution)
    }


def _parse_with_fallback(text: str, subject: str) -> List[Dict[str, Any]]:
    """
    Fallback parsing strategy for malformed output.
    
    Args:
        text: Raw text to parse
        subject: Subject name
        
    Returns:
        List of parsed questions
    """
    logger.info("Using fallback parsing strategy")
    
    # Try to split by double newlines or question numbers
    blocks = re.split(r'\n\s*\n+|(?=Q\d+)', text)
    blocks = [b.strip() for b in blocks if b.strip() and len(b) > 50]
    
    questions = []
    for i, block in enumerate(blocks):
        try:
            question = _parse_question_block(block, i)
            if question and question.get("options") and len(question["options"]) >= 3:
                questions.append(question)
        except Exception:
            continue
    
    return questions


def validate_parsed_questions(
    questions: List[Dict[str, Any]],
    expected_count: int
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Validate and filter parsed questions.
    
    Args:
        questions: List of parsed questions
        expected_count: Expected number of questions
        
    Returns:
        Tuple of (valid_questions, invalid_count)
    """
    valid_questions = []
    invalid_count = 0
    
    for question in questions:
        if validate_question(question, raise_on_error=False):
            valid_questions.append(question)
        else:
            invalid_count += 1
    
    logger.info(
        f"Validation: {len(valid_questions)}/{len(questions)} valid "
        f"(expected: {expected_count})"
    )
    
    return valid_questions, invalid_count