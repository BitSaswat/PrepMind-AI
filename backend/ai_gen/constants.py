"""
Constants used throughout the AI generation module.
Centralizes magic numbers and strings for easier maintenance.
"""

from typing import Final

# ============================================
# LLM Configuration
# ============================================

# Model settings
DEFAULT_MODEL: Final[str] = "gemini-2.5-flash"  # Updated to gemini-2.5-flash for faster responses
DEFAULT_TEMPERATURE: Final[float] = 0.4
MAX_TOKENS: Final[int] = 8192
TOP_P: Final[float] = 0.95
TOP_K: Final[int] = 40

# API settings
API_TIMEOUT: Final[int] = 120  # seconds
DEFAULT_LOCATION: Final[str] = "us-central1"
MAX_RETRIES: Final[int] = 10
RETRY_DELAY: Final[float] = 1.0  # seconds
RETRY_BACKOFF_FACTOR: Final[float] = 2.0  # exponential backoff multiplier

# Rate limiting
MAX_REQUESTS_PER_MINUTE: Final[int] = 60
RATE_LIMIT_BUFFER: Final[float] = 0.1  # 10% buffer

# ============================================
# Question Generation
# ============================================

# Question limits
MIN_QUESTIONS_PER_SUBJECT: Final[int] = 1
MAX_QUESTIONS_PER_SUBJECT: Final[int] = 100
DEFAULT_QUESTIONS_PER_SUBJECT: Final[int] = 30

# Difficulty levels
DIFFICULTY_EASY: Final[str] = "Easy"
DIFFICULTY_MEDIUM: Final[str] = "Medium"
DIFFICULTY_HARD: Final[str] = "Hard"
VALID_DIFFICULTIES: Final[tuple] = (DIFFICULTY_EASY, DIFFICULTY_MEDIUM, DIFFICULTY_HARD)

# Exam types
EXAM_JEE: Final[str] = "JEE"
EXAM_NEET: Final[str] = "NEET"
EXAM_UPSC: Final[str] = "UPSC"
EXAM_CSAT: Final[str] = "CSAT"
VALID_EXAMS: Final[tuple] = (EXAM_JEE, EXAM_NEET, EXAM_UPSC, EXAM_CSAT)

# Question structure
NUM_OPTIONS: Final[int] = 4
VALID_OPTIONS: Final[tuple] = ("A", "B", "C", "D")

# ============================================
# Parsing
# ============================================

# Regex patterns
QUESTION_PATTERN: Final[str] = r'\n(?=Q\d+\.)'
ANSWER_PATTERN: Final[str] = r'Answer:\s*([A-D])'
NUMERICAL_ANSWER_PATTERN: Final[str] = r'Answer:\s*(\-?\d+)'  # Support negative integers too
SOLUTION_PATTERN: Final[str] = r'Solution:\s*(.*)'
OPTION_PATTERN: Final[str] = r'{opt}\)\s*(.*)'

# Parsing thresholds
MIN_QUESTION_LENGTH: Final[int] = 10  # characters
MAX_QUESTION_LENGTH: Final[int] = 1000  # characters
MIN_OPTION_LENGTH: Final[int] = 1  # characters
MAX_OPTION_LENGTH: Final[int] = 500  # characters
MIN_SOLUTION_LENGTH: Final[int] = 10  # characters

# Quality thresholds
MIN_PARSE_SUCCESS_RATE: Final[float] = 0.8  # 80%

# ============================================
# PDF Generation
# ============================================

# Page settings
PDF_PAGE_WIDTH: Final[int] = 595  # A4 width in points
PDF_PAGE_HEIGHT: Final[int] = 842  # A4 height in points
PDF_MARGIN_LEFT: Final[int] = 40
PDF_MARGIN_RIGHT: Final[int] = 40
PDF_MARGIN_TOP: Final[int] = 50
PDF_MARGIN_BOTTOM: Final[int] = 80

# Font settings
PDF_FONT_TITLE: Final[str] = "Helvetica-Bold"
PDF_FONT_HEADING: Final[str] = "Helvetica-Bold"
PDF_FONT_BODY: Final[str] = "Helvetica"
PDF_FONT_CODE: Final[str] = "Courier"

PDF_FONT_SIZE_TITLE: Final[int] = 16
PDF_FONT_SIZE_HEADING: Final[int] = 14
PDF_FONT_SIZE_SUBHEADING: Final[int] = 12
PDF_FONT_SIZE_BODY: Final[int] = 11
PDF_FONT_SIZE_SMALL: Final[int] = 9

# Spacing
PDF_LINE_HEIGHT: Final[int] = 18
PDF_PARAGRAPH_SPACING: Final[int] = 10
PDF_SECTION_SPACING: Final[int] = 25
PDF_QUESTION_SPACING: Final[int] = 15
PDF_OPTION_SPACING: Final[int] = 15

# Text wrapping
PDF_MAX_LINE_WIDTH: Final[int] = 515  # page width - margins
PDF_CHARS_PER_LINE: Final[int] = 80

# ============================================
# Evaluation
# ============================================

# Marking schemes (default)
MARKS_CORRECT: Final[int] = 4
MARKS_WRONG: Final[int] = -1
MARKS_UNATTEMPTED: Final[int] = 0

# Analytics
PERCENTILE_RANGES: Final[tuple] = (90, 75, 50, 25)  # for categorization

# ============================================
# Validation
# ============================================

# Field validation
REQUIRED_QUESTION_FIELDS: Final[tuple] = ("id", "subject", "question", "options", "correct", "solution")
REQUIRED_OPTION_KEYS: Final[tuple] = ("A", "B", "C", "D")

# ============================================
# Caching (for future use)
# ============================================

CACHE_TTL: Final[int] = 3600  # 1 hour in seconds
CACHE_MAX_SIZE: Final[int] = 1000  # max cached items

# ============================================
# Logging
# ============================================

LOG_FORMAT: Final[str] = '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
LOG_DATE_FORMAT: Final[str] = '%Y-%m-%d %H:%M:%S'
LOG_MAX_BYTES: Final[int] = 10 * 1024 * 1024  # 10MB
LOG_BACKUP_COUNT: Final[int] = 5

# ============================================
# Error Messages
# ============================================

ERROR_API_KEY_MISSING: Final[str] = "GEMINI_API_KEY not found in environment variables"
ERROR_INVALID_EXAM: Final[str] = "Invalid exam type. Must be one of: {exams}"
ERROR_INVALID_SUBJECT: Final[str] = "Invalid subject '{subject}' for {exam}"
ERROR_INVALID_DIFFICULTY: Final[str] = "Invalid difficulty level. Must be one of: {levels}"
ERROR_INSUFFICIENT_QUESTIONS: Final[str] = "Generated {generated} questions, but {requested} were requested"
ERROR_PARSING_FAILED: Final[str] = "Failed to parse LLM output for subject: {subject}"
ERROR_VALIDATION_FAILED: Final[str] = "Question validation failed: {reason}"
ERROR_PDF_GENERATION: Final[str] = "PDF generation failed: {reason}"
ERROR_API_TIMEOUT: Final[str] = "API request timed out after {timeout} seconds"
ERROR_RATE_LIMIT: Final[str] = "Rate limit exceeded. Retry after {retry_after} seconds"
