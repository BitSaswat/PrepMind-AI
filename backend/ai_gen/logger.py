"""
Logging configuration for the AI generation module.
Provides structured logging with file rotation and different log levels.
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional

# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Log file paths
MAIN_LOG_FILE = LOGS_DIR / "ai_gen.log"
ERROR_LOG_FILE = LOGS_DIR / "ai_gen_error.log"


def setup_logger(
    name: str = "ai_gen",
    level: int = logging.INFO,
    log_to_file: bool = True,
    log_to_console: bool = True
) -> logging.Logger:
    """
    Set up and configure a logger with file and console handlers.
    
    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Whether to log to file
        log_to_console: Whether to log to console
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        fmt='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # File handler for all logs (with rotation)
    if log_to_file:
        file_handler = RotatingFileHandler(
            MAIN_LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        logger.addHandler(file_handler)
        
        # Separate file handler for errors only
        error_handler = RotatingFileHandler(
            ERROR_LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(detailed_formatter)
        logger.addHandler(error_handler)
    
    # Console handler
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(simple_formatter)
        logger.addHandler(console_handler)
    
    return logger


# Create default logger instance
logger = setup_logger()


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance.
    
    Args:
        name: Optional logger name. If None, returns the default logger.
        
    Returns:
        Logger instance
    """
    if name:
        return logging.getLogger(f"ai_gen.{name}")
    return logger


# Convenience functions for logging
def log_api_call(endpoint: str, params: dict) -> None:
    """Log an API call with parameters."""
    logger.info(f"API Call: {endpoint}", extra={"params": params})


def log_api_response(endpoint: str, status: str, duration: float) -> None:
    """Log an API response."""
    logger.info(f"API Response: {endpoint} - {status} ({duration:.2f}s)")


def log_parsing_attempt(text_length: int, subject: str) -> None:
    """Log a parsing attempt."""
    logger.debug(f"Parsing attempt: {subject} ({text_length} chars)")


def log_parsing_result(success: bool, questions_count: int) -> None:
    """Log parsing result."""
    if success:
        logger.info(f"Parsing successful: {questions_count} questions extracted")
    else:
        logger.error(f"Parsing failed: {questions_count} questions extracted")


def log_generation_start(exam: str, subjects: list) -> None:
    """Log the start of question generation."""
    logger.info(f"Starting question generation: {exam} - {', '.join(subjects)}")


def log_generation_complete(total_questions: int, duration: float) -> None:
    """Log completion of question generation."""
    logger.info(f"Generation complete: {total_questions} questions in {duration:.2f}s")
