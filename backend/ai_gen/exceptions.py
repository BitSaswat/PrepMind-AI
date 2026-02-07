"""
Custom exceptions for the AI generation module.
Provides a clear exception hierarchy for different error types.
"""


class AIGenException(Exception):
    """Base exception for all AI generation errors."""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
    
    def __str__(self):
        if self.details:
            return f"{self.message} | Details: {self.details}"
        return self.message


class LLMServiceError(AIGenException):
    """Raised when LLM service encounters an error."""
    pass


class APIError(LLMServiceError):
    """Raised when API call fails."""
    
    def __init__(self, message: str, status_code: int = None, response: str = None):
        super().__init__(message, {"status_code": status_code, "response": response})
        self.status_code = status_code
        self.response = response


class RateLimitError(LLMServiceError):
    """Raised when API rate limit is exceeded."""
    
    def __init__(self, message: str, retry_after: int = None):
        super().__init__(message, {"retry_after": retry_after})
        self.retry_after = retry_after


class TimeoutError(LLMServiceError):
    """Raised when API request times out."""
    pass


class ParsingError(AIGenException):
    """Raised when parsing LLM output fails."""
    
    def __init__(self, message: str, raw_text: str = None, subject: str = None):
        super().__init__(message, {"subject": subject, "text_length": len(raw_text) if raw_text else 0})
        self.raw_text = raw_text
        self.subject = subject


class ValidationError(AIGenException):
    """Raised when data validation fails."""
    
    def __init__(self, message: str, field: str = None, value: any = None):
        super().__init__(message, {"field": field, "value": str(value) if value else None})
        self.field = field
        self.value = value


class QuestionValidationError(ValidationError):
    """Raised when question validation fails."""
    
    def __init__(self, message: str, question_id: int = None, missing_fields: list = None):
        super().__init__(message, field="question", value=question_id)
        self.question_id = question_id
        self.missing_fields = missing_fields or []


class ConfigurationError(AIGenException):
    """Raised when configuration is invalid or missing."""
    
    def __init__(self, message: str, config_key: str = None):
        super().__init__(message, {"config_key": config_key})
        self.config_key = config_key


class PDFGenerationError(AIGenException):
    """Raised when PDF generation fails."""
    
    def __init__(self, message: str, page_number: int = None):
        super().__init__(message, {"page_number": page_number})
        self.page_number = page_number


class InsufficientQuestionsError(AIGenException):
    """Raised when not enough questions are generated."""
    
    def __init__(self, requested: int, generated: int, subject: str = None):
        message = f"Insufficient questions: requested {requested}, generated {generated}"
        super().__init__(message, {"requested": requested, "generated": generated, "subject": subject})
        self.requested = requested
        self.generated = generated
        self.subject = subject


class InvalidExamTypeError(ValidationError):
    """Raised when exam type is invalid."""
    
    def __init__(self, exam_type: str, valid_types: list):
        message = f"Invalid exam type: {exam_type}. Valid types: {', '.join(valid_types)}"
        super().__init__(message, field="exam_type", value=exam_type)
        self.exam_type = exam_type
        self.valid_types = valid_types


class InvalidSubjectError(ValidationError):
    """Raised when subject is invalid for the given exam."""
    
    def __init__(self, subject: str, exam: str, valid_subjects: list):
        message = f"Invalid subject '{subject}' for {exam}. Valid subjects: {', '.join(valid_subjects)}"
        super().__init__(message, field="subject", value=subject)
        self.subject = subject
        self.exam = exam
        self.valid_subjects = valid_subjects


class InvalidDifficultyError(ValidationError):
    """Raised when difficulty level is invalid."""
    
    def __init__(self, difficulty: str, valid_levels: list):
        message = f"Invalid difficulty: {difficulty}. Valid levels: {', '.join(valid_levels)}"
        super().__init__(message, field="difficulty", value=difficulty)
        self.difficulty = difficulty
        self.valid_levels = valid_levels
