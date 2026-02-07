"""
Evaluation module for scoring test attempts and generating analytics.
Provides comprehensive evaluation with subject-wise breakdown and insights.
"""

from typing import Dict, List, Any, Optional
from collections import defaultdict

from .logger import get_logger
from .models import EvaluationResult, SubjectResult, MarkingScheme
from .exam_config import get_marking_scheme
from .validators import validate_user_answer
from .exceptions import ValidationError

# Initialize logger
logger = get_logger("evaluation")


def evaluate(
    questions: List[Dict[str, Any]],
    user_answers: Dict[int, Optional[str]],
    exam: str
) -> Dict[str, Any]:
    """
    Evaluate user's test attempt with comprehensive analytics.
    
    Args:
        questions: List of question dictionaries
        user_answers: Dictionary mapping question IDs to user answers
        exam: Exam type for marking scheme
        
    Returns:
        Dictionary containing evaluation results and analytics
        
    Raises:
        ValidationError: If inputs are invalid
    """
    logger.info(f"Starting evaluation for {exam} with {len(questions)} questions")
    
    # Validate inputs
    if not questions:
        raise ValidationError("Questions list cannot be empty", field="questions")
    
    # Get marking scheme
    scheme_dict = get_marking_scheme(exam)
    scheme = MarkingScheme(**scheme_dict)
    
    # Initialize counters
    total_marks = 0.0
    positive_marks = 0.0
    negative_marks = 0.0
    
    correct_count = 0
    wrong_count = 0
    unattempted_count = 0
    
    # Subject-wise tracking
    subject_stats = defaultdict(lambda: {
        "total": 0,
        "attempted": 0,
        "correct": 0,
        "wrong": 0,
        "unattempted": 0,
        "marks": 0.0,
        "max_marks": 0.0
    })
    
    # Detailed question results
    question_details = []
    
    # Evaluate each question
    for question in questions:
        q_id = question["id"]
        subject = question.get("subject", "Unknown")
        correct_answer = question["correct"]
        user_answer = user_answers.get(q_id)
        
        # Validate user answer
        if not validate_user_answer(user_answer):
            logger.warning(f"Invalid user answer for Q{q_id}: {user_answer}")
            user_answer = None
        
        # Calculate marks
        if user_answer == correct_answer:
            marks = scheme.correct
            positive_marks += marks
            correct_count += 1
            subject_stats[subject]["correct"] += 1
            subject_stats[subject]["attempted"] += 1
            is_correct = True
        elif user_answer is None:
            marks = scheme.unattempted
            unattempted_count += 1
            subject_stats[subject]["unattempted"] += 1
            is_correct = False
        else:
            marks = scheme.wrong
            negative_marks += abs(marks)
            wrong_count += 1
            subject_stats[subject]["wrong"] += 1
            subject_stats[subject]["attempted"] += 1
            is_correct = False
        
        total_marks += marks
        subject_stats[subject]["marks"] += marks
        subject_stats[subject]["max_marks"] += scheme.correct
        subject_stats[subject]["total"] += 1
        
        # Store question details
        question_details.append({
            "id": q_id,
            "subject": subject,
            "question": question.get("question", ""),
            "your_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "marks_obtained": marks,
            "solution": question.get("solution", "")
        })
    
    # Calculate overall accuracy
    attempted = correct_count + wrong_count
    accuracy = (correct_count / attempted * 100) if attempted > 0 else 0.0
    
    # Create subject results
    subject_results = []
    for subject, stats in subject_stats.items():
        subject_accuracy = (
            (stats["correct"] / stats["attempted"] * 100)
            if stats["attempted"] > 0 else 0.0
        )
        
        subject_result = SubjectResult(
            subject=subject,
            total_questions=stats["total"],
            attempted=stats["attempted"],
            correct=stats["correct"],
            wrong=stats["wrong"],
            unattempted=stats["unattempted"],
            marks_obtained=stats["marks"],
            max_marks=stats["max_marks"]
        )
        subject_results.append(subject_result)
    
    # Create evaluation result
    result = EvaluationResult(
        total_marks=total_marks,
        positive_marks=positive_marks,
        negative_marks=negative_marks,
        total_questions=len(questions),
        attempted=attempted,
        correct=correct_count,
        wrong=wrong_count,
        unattempted=unattempted_count,
        accuracy=accuracy,
        subject_results=subject_results,
        question_details=question_details
    )
    
    logger.info(
        f"Evaluation complete: {total_marks:.1f} marks, "
        f"{correct_count}/{len(questions)} correct ({accuracy:.1f}% accuracy)"
    )
    
    return result.to_dict()


def calculate_percentile(score: float, all_scores: List[float]) -> float:
    """
    Calculate percentile for a given score.
    
    Args:
        score: User's score
        all_scores: List of all scores to compare against
        
    Returns:
        Percentile (0-100)
    """
    if not all_scores:
        return 0.0
    
    scores_below = sum(1 for s in all_scores if s < score)
    percentile = (scores_below / len(all_scores)) * 100
    
    return round(percentile, 2)


def get_performance_insights(
    result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate performance insights and recommendations.
    
    Args:
        result: Evaluation result dictionary
        
    Returns:
        Dictionary containing insights and recommendations
    """
    insights = {
        "strengths": [],
        "weaknesses": [],
        "recommendations": []
    }
    
    # Analyze overall performance
    accuracy = result["accuracy"]
    if accuracy >= 80:
        insights["strengths"].append("Excellent overall accuracy")
    elif accuracy >= 60:
        insights["strengths"].append("Good overall performance")
    else:
        insights["weaknesses"].append("Overall accuracy needs improvement")
    
    # Analyze subject-wise performance
    for subject_result in result["subject_results"]:
        subject = subject_result["subject"]
        subject_acc = subject_result["accuracy"]
        
        if subject_acc >= 80:
            insights["strengths"].append(f"Strong performance in {subject}")
        elif subject_acc < 50:
            insights["weaknesses"].append(f"Weak performance in {subject}")
            insights["recommendations"].append(
                f"Focus more on {subject} - review concepts and practice more questions"
            )
    
    # Analyze attempt rate
    attempt_rate = (result["attempted"] / result["total_questions"]) * 100
    if attempt_rate < 80:
        insights["recommendations"].append(
            "Try to attempt more questions - unattempted questions give 0 marks"
        )
    
    # Analyze negative marking impact
    if result["negative_marks"] > result["positive_marks"] * 0.3:
        insights["recommendations"].append(
            "Be more careful with answers - high negative marking detected"
        )
    
    return insights
