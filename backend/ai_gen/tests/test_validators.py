"""
Unit tests for validators module.
Tests all validation functions with valid and invalid inputs.
"""

import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ai_gen.validators import (
    validate_exam_type, validate_subject, validate_difficulty,
    validate_num_questions, validate_chapters, validate_question,
    validate_question_structure, validate_questions_list,
    validate_user_answer, sanitize_text
)
from ai_gen.exceptions import (
    ValidationError, InvalidExamTypeError, InvalidSubjectError,
    InvalidDifficultyError, QuestionValidationError
)


class TestValidators(unittest.TestCase):
    """Test cases for validator functions."""
    
    def test_validate_exam_type_valid(self):
        """Test valid exam types."""
        try:
            validate_exam_type("JEE")
            validate_exam_type("NEET")
        except Exception as e:
            self.fail(f"Valid exam type raised exception: {e}")
    
    def test_validate_exam_type_invalid(self):
        """Test invalid exam types."""
        with self.assertRaises(InvalidExamTypeError):
            validate_exam_type("INVALID")
        with self.assertRaises(InvalidExamTypeError):
            validate_exam_type("jee")  # Case sensitive
    
    def test_validate_subject_valid(self):
        """Test valid subjects for exams."""
        try:
            validate_subject("JEE", "Physics")
            validate_subject("JEE", "Chemistry")
            validate_subject("JEE", "Mathematics")
            validate_subject("NEET", "Physics")
            validate_subject("NEET", "Chemistry")
            validate_subject("NEET", "Biology")
        except Exception as e:
            self.fail(f"Valid subject raised exception: {e}")
    
    def test_validate_subject_invalid(self):
        """Test invalid subjects."""
        with self.assertRaises(InvalidSubjectError):
            validate_subject("JEE", "Biology")  # Biology not in JEE
        with self.assertRaises(InvalidSubjectError):
            validate_subject("NEET", "Mathematics")  # Math not in NEET
    
    def test_validate_difficulty_valid(self):
        """Test valid difficulty levels."""
        try:
            validate_difficulty("Easy")
            validate_difficulty("Medium")
            validate_difficulty("Hard")
        except Exception as e:
            self.fail(f"Valid difficulty raised exception: {e}")
    
    def test_validate_difficulty_invalid(self):
        """Test invalid difficulty levels."""
        with self.assertRaises(InvalidDifficultyError):
            validate_difficulty("easy")  # Case sensitive
        with self.assertRaises(InvalidDifficultyError):
            validate_difficulty("Extreme")
    
    def test_validate_num_questions_valid(self):
        """Test valid question counts."""
        try:
            validate_num_questions(1)
            validate_num_questions(30)
            validate_num_questions(100)
        except Exception as e:
            self.fail(f"Valid num_questions raised exception: {e}")
    
    def test_validate_num_questions_invalid(self):
        """Test invalid question counts."""
        with self.assertRaises(ValidationError):
            validate_num_questions(0)  # Too low
        with self.assertRaises(ValidationError):
            validate_num_questions(101)  # Too high
        with self.assertRaises(ValidationError):
            validate_num_questions("10")  # Wrong type
    
    def test_validate_question_structure_valid(self):
        """Test valid question structure."""
        valid_question = {
            "id": 0,
            "subject": "Physics",
            "question": "What is the SI unit of force?",
            "options": {
                "A": "Newton",
                "B": "Joule",
                "C": "Watt",
                "D": "Pascal"
            },
            "correct": "A",
            "solution": "The SI unit of force is Newton (N)."
        }
        
        is_valid, errors = validate_question_structure(valid_question)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
    
    def test_validate_question_structure_missing_fields(self):
        """Test question with missing required fields."""
        invalid_question = {
            "id": 0,
            "question": "Test question?"
            # Missing: subject, options, correct, solution
        }
        
        is_valid, errors = validate_question_structure(invalid_question)
        self.assertFalse(is_valid)
        self.assertGreater(len(errors), 0)
    
    def test_validate_question_structure_invalid_options(self):
        """Test question with invalid options."""
        invalid_question = {
            "id": 0,
            "subject": "Physics",
            "question": "Test question?",
            "options": {
                "A": "Option A",
                "B": "Option B"
                # Missing C and D
            },
            "correct": "A",
            "solution": "Test solution"
        }
        
        is_valid, errors = validate_question_structure(invalid_question)
        self.assertFalse(is_valid)
        self.assertGreater(len(errors), 0)
    
    def test_validate_question_structure_invalid_correct_answer(self):
        """Test question with invalid correct answer."""
        invalid_question = {
            "id": 0,
            "subject": "Physics",
            "question": "Test question?",
            "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            },
            "correct": "E",  # Invalid
            "solution": "Test solution"
        }
        
        is_valid, errors = validate_question_structure(invalid_question)
        self.assertFalse(is_valid)
        self.assertGreater(len(errors), 0)
    
    def test_validate_user_answer_valid(self):
        """Test valid user answers."""
        self.assertTrue(validate_user_answer("A"))
        self.assertTrue(validate_user_answer("B"))
        self.assertTrue(validate_user_answer("C"))
        self.assertTrue(validate_user_answer("D"))
        self.assertTrue(validate_user_answer(None))  # Unattempted
    
    def test_validate_user_answer_invalid(self):
        """Test invalid user answers."""
        self.assertFalse(validate_user_answer("E"))
        self.assertFalse(validate_user_answer("a"))
        self.assertFalse(validate_user_answer("1"))
    
    def test_sanitize_text(self):
        """Test text sanitization."""
        # Test whitespace removal
        self.assertEqual(sanitize_text("  hello   world  "), "hello world")
        
        # Test length limiting
        long_text = "a" * 100
        sanitized = sanitize_text(long_text, max_length=50)
        self.assertLessEqual(len(sanitized), 53)  # 50 + "..."
        
        # Test newline handling
        self.assertEqual(sanitize_text("hello\n\nworld"), "hello world")


class TestQuestionValidation(unittest.TestCase):
    """Test cases for question validation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.valid_question = {
            "id": 0,
            "subject": "Physics",
            "question": "What is the acceleration due to gravity on Earth?",
            "options": {
                "A": "9.8 m/s²",
                "B": "10 m/s²",
                "C": "8.9 m/s²",
                "D": "11 m/s²"
            },
            "correct": "A",
            "solution": "The standard acceleration due to gravity is approximately 9.8 m/s²."
        }
    
    def test_validate_question_valid(self):
        """Test validation of valid question."""
        result = validate_question(self.valid_question, raise_on_error=False)
        self.assertTrue(result)
    
    def test_validate_question_invalid_raises(self):
        """Test that invalid question raises exception when raise_on_error=True."""
        invalid_question = {"id": 0}  # Missing everything
        
        with self.assertRaises(QuestionValidationError):
            validate_question(invalid_question, raise_on_error=True)
    
    def test_validate_question_invalid_no_raise(self):
        """Test that invalid question returns False when raise_on_error=False."""
        invalid_question = {"id": 0}  # Missing everything
        
        result = validate_question(invalid_question, raise_on_error=False)
        self.assertFalse(result)
    
    def test_validate_questions_list(self):
        """Test validation of question list."""
        questions = [
            self.valid_question,
            self.valid_question.copy(),
            {"id": 2}  # Invalid
        ]
        
        valid_count, invalid_count = validate_questions_list(questions)
        self.assertEqual(valid_count, 2)
        self.assertEqual(invalid_count, 1)
    
    def test_validate_questions_list_min_count(self):
        """Test validation with minimum count requirement."""
        questions = [self.valid_question]
        
        with self.assertRaises(ValidationError):
            validate_questions_list(questions, min_count=5)


if __name__ == '__main__':
    unittest.main()
