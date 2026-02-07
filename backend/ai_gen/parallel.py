"""
Parallel processing utilities for faster question generation.
Enables concurrent generation for multiple subjects.
"""

import concurrent.futures
from typing import Dict, List, Any, Tuple, Callable
from functools import partial

from .logger import get_logger
from .exceptions import AIGenException

# Initialize logger
logger = get_logger("parallel")


def process_subjects_parallel(
    subjects: List[str],
    process_func: Callable,
    max_workers: int = 3,
    **common_kwargs
) -> Dict[str, Any]:
    """
    Process multiple subjects in parallel.
    
    Args:
        subjects: List of subject names to process
        process_func: Function to call for each subject
        max_workers: Maximum number of parallel workers
        **common_kwargs: Common keyword arguments for all subjects
        
    Returns:
        Dictionary mapping subjects to results
        
    Raises:
        AIGenException: If processing fails for all subjects
    """
    logger.info(f"Starting parallel processing for {len(subjects)} subjects with {max_workers} workers")
    
    results = {}
    errors = {}
    
    # Create partial function with common kwargs
    func_with_kwargs = partial(process_func, **common_kwargs)
    
    # Process subjects in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_subject = {
            executor.submit(func_with_kwargs, subject): subject
            for subject in subjects
        }
        
        # Collect results as they complete
        for future in concurrent.futures.as_completed(future_to_subject):
            subject = future_to_subject[future]
            
            try:
                result = future.result()
                results[subject] = result
                logger.info(f"Successfully processed {subject}")
            except Exception as e:
                errors[subject] = str(e)
                logger.error(f"Failed to process {subject}: {str(e)}")
    
    # Log summary
    logger.info(
        f"Parallel processing complete: {len(results)} succeeded, "
        f"{len(errors)} failed"
    )
    
    # If all failed, raise exception
    if not results and errors:
        raise AIGenException(
            f"All subjects failed to process",
            details={"errors": errors}
        )
    
    return results, errors


def generate_subjects_parallel(
    exam: str,
    subject_data: Dict[str, Dict[str, Any]],
    max_workers: int = 3
) -> Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
    """
    Generate questions for multiple subjects in parallel.
    
    Args:
        exam: Exam type
        subject_data: Dictionary mapping subjects to their configurations
        max_workers: Maximum number of parallel workers
        
    Returns:
        Tuple of (all_questions, questions_by_subject)
    """
    from .question_generator import _generate_subject_questions
    
    logger.info(f"Generating questions for {len(subject_data)} subjects in parallel")
    
    all_questions = []
    by_subject = {}
    question_id = 0
    
    # Process each subject
    results, errors = process_subjects_parallel(
        subjects=list(subject_data.keys()),
        process_func=lambda subject: _generate_subject_questions(
            exam=exam,
            subject=subject,
            chapters=subject_data[subject]["chapters"],
            num_questions=subject_data[subject]["num_questions"],
            difficulty=subject_data[subject]["difficulty"]
        ),
        max_workers=max_workers
    )
    
    # Collect and assign IDs
    for subject, questions in results.items():
        by_subject[subject] = []
        for question in questions:
            question["id"] = question_id
            question_id += 1
            all_questions.append(question)
            by_subject[subject].append(question)
    
    # Add empty lists for failed subjects
    for subject in errors:
        by_subject[subject] = []
    
    logger.info(f"Generated {len(all_questions)} total questions across {len(results)} subjects")
    
    return all_questions, by_subject


def batch_process(
    items: List[Any],
    process_func: Callable,
    batch_size: int = 10,
    max_workers: int = 3
) -> List[Any]:
    """
    Process items in batches using parallel processing.
    
    Args:
        items: List of items to process
        process_func: Function to process each item
        batch_size: Number of items per batch
        max_workers: Maximum number of parallel workers
        
    Returns:
        List of results
    """
    logger.info(f"Batch processing {len(items)} items (batch_size={batch_size}, workers={max_workers})")
    
    results = []
    
    # Create batches
    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    
    # Process batches in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_func, batch) for batch in batches]
        
        for future in concurrent.futures.as_completed(futures):
            try:
                batch_results = future.result()
                results.extend(batch_results)
            except Exception as e:
                logger.error(f"Batch processing error: {str(e)}")
    
    logger.info(f"Batch processing complete: {len(results)} results")
    return results
