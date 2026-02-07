#!/usr/bin/env python3
"""
Command-line interface for the AI generation module.
Allows Node.js backend to call Python functions via subprocess.

Usage:
    python -m ai_gen.cli generate-questions --config config.json
    python -m ai_gen.cli generate-pdf --questions questions.json --title "Test"
    python -m ai_gen.cli evaluate --questions questions.json --answers answers.json
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_gen import (
    generate_questions,
    evaluate,
    generate_question_pdf,
    generate_answer_pdf
)
from ai_gen.logger import get_logger
from ai_gen.exceptions import AIGenException
from ai_gen.performance import get_monitor, get_performance_report

# Initialize logger
logger = get_logger("cli")


def output_json(data: Dict[str, Any]) -> None:
    """
    Output JSON to stdout for Node.js to capture.
    
    Args:
        data: Dictionary to output as JSON
    """
    print(json.dumps(data, indent=2, ensure_ascii=False))
    sys.stdout.flush()


def output_error(error: str, details: Dict[str, Any] = None) -> None:
    """
    Output error in JSON format.
    
    Args:
        error: Error message
        details: Optional error details
    """
    error_data = {
        "success": False,
        "error": error
    }
    if details:
        error_data["details"] = details
    
    output_json(error_data)
    sys.exit(0)


def cmd_generate_questions(args) -> None:
    """
    Generate questions based on configuration.
    
    Args:
        args: Command-line arguments
    """
    try:
        # Load configuration
        if args.config:
            with open(args.config, 'r') as f:
                config = json.load(f)
        else:
            # Read from stdin
            config = json.load(sys.stdin)
        
        logger.info(f"Generating questions with config: {config}")
        
        # Extract parameters
        exam = config.get("exam")
        subject_data = config.get("subject_data", {})
        
        if not exam or not subject_data:
            output_error("Missing required fields: exam and subject_data")
            return
        
        # Generate questions
        questions, by_subject = generate_questions(exam, subject_data)
        
        # Get performance metrics
        monitor = get_monitor()
        stats = monitor.get_stats()
        
        # Output result
        output_json({
            "success": True,
            "questions": questions,
            "by_subject": by_subject,
            "metadata": {
                "total_questions": len(questions),
                "subjects": list(by_subject.keys()),
                "performance": stats
            }
        })
        
    except AIGenException as e:
        logger.error(f"AI generation error: {str(e)}")
        output_error(str(e), {"type": type(e).__name__})
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        output_error(f"Unexpected error: {str(e)}")


def cmd_generate_pdf(args) -> None:
    """
    Generate PDF from questions.
    
    Args:
        args: Command-line arguments
    """
    try:
        # Load questions
        if args.questions:
            with open(args.questions, 'r') as f:
                data = json.load(f)
        else:
            data = json.load(sys.stdin)
        
        questions_by_subject = data.get("questions_by_subject", {})
        title = data.get("title", "Mock Test")
        with_solutions = data.get("with_solutions", False)
        
        logger.info(f"Generating PDF: {title} (solutions: {with_solutions})")
        
        # Generate appropriate PDF
        if with_solutions:
            pdf_buffer = generate_answer_pdf(questions_by_subject, f"{title} - Answer Key")
        else:
            pdf_buffer = generate_question_pdf(questions_by_subject, title)
        
        # Output PDF as base64
        import base64
        pdf_base64 = base64.b64encode(pdf_buffer.read()).decode('utf-8')
        
        output_json({
            "success": True,
            "pdf": pdf_base64,
            "title": title,
            "with_solutions": with_solutions
        })
        
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}", exc_info=True)
        output_error(f"PDF generation failed: {str(e)}")


def cmd_evaluate(args) -> None:
    """
    Evaluate test answers.
    
    Args:
        args: Command-line arguments
    """
    try:
        # Load data
        if args.data:
            with open(args.data, 'r') as f:
                data = json.load(f)
        else:
            data = json.load(sys.stdin)
        
        questions = data.get("questions", [])
        user_answers = data.get("user_answers", {})
        exam = data.get("exam", "JEE")
        
        # Convert string keys to integers for user_answers
        user_answers = {int(k): v for k, v in user_answers.items()}
        
        logger.info(f"Evaluating {len(questions)} questions")
        
        # Evaluate
        result = evaluate(questions, user_answers, exam)
        
        output_json({
            "success": True,
            "result": result
        })
        
    except Exception as e:
        logger.error(f"Evaluation error: {str(e)}", exc_info=True)
        output_error(f"Evaluation failed: {str(e)}")


def cmd_health_check(args) -> None:
    """
    Health check to verify module is working.
    
    Args:
        args: Command-line arguments
    """
    try:
        from ai_gen.constants import DEFAULT_MODEL
        from ai_gen.cache import get_cache_stats
        
        cache_stats = get_cache_stats()
        
        output_json({
            "success": True,
            "status": "healthy",
            "model": DEFAULT_MODEL,
            "cache_stats": cache_stats,
            "version": "2.0.0"
        })
        
    except Exception as e:
        output_error(f"Health check failed: {str(e)}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="AI Generation Module CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Generate questions command
    gen_parser = subparsers.add_parser(
        "generate-questions",
        help="Generate questions based on configuration"
    )
    gen_parser.add_argument(
        "--config",
        help="Path to JSON config file (or use stdin)"
    )
    
    # Generate PDF command
    pdf_parser = subparsers.add_parser(
        "generate-pdf",
        help="Generate PDF from questions"
    )
    pdf_parser.add_argument(
        "--questions",
        help="Path to JSON questions file (or use stdin)"
    )
    
    # Evaluate command
    eval_parser = subparsers.add_parser(
        "evaluate",
        help="Evaluate test answers"
    )
    eval_parser.add_argument(
        "--data",
        help="Path to JSON data file (or use stdin)"
    )
    
    # Health check command
    subparsers.add_parser(
        "health-check",
        help="Check if module is working"
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Route to appropriate command
    commands = {
        "generate-questions": cmd_generate_questions,
        "generate-pdf": cmd_generate_pdf,
        "evaluate": cmd_evaluate,
        "health-check": cmd_health_check
    }
    
    command_func = commands.get(args.command)
    if command_func:
        command_func(args)
    else:
        output_error(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
