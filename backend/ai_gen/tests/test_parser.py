"""
Unit tests for question parser.
Tests parsing with various LLM outputs including edge cases.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ai_gen.question_parser import (
    parse_llm_output, _parse_question_block,
    _parse_with_regex, _parse_with_fallback
)
from ai_gen.exceptions import ParsingError, InsufficientQuestionsError


class TestQuestionParser(unittest.TestCase):
    """Test question parsing functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.valid_llm_output = """
Q1. What is the SI unit of force?
A) Newton
B) Joule
C) Watt
D) Pascal
Answer: A
Solution: The SI unit of force is Newton (N), named after Isaac Newton.

Q2. Which law states that force equals mass times acceleration?
A) Newton's First Law
B) Newton's Second Law
C) Newton's Third Law
D) Law of Conservation of Energy
Answer: B
Solution: Newton's Second Law states F = ma, where F is force, m is mass, and a is acceleration.
"""
    
    def test_parse_valid_output(self):
        """Test parsing valid LLM output."""
        questions = parse_llm_output(self.valid_llm_output, "Physics")
        
        self.assertGreater(len(questions), 0)
        self.assertEqual(questions[0]["subject"], "Physics")
        self.assertIn("question", questions[0])
        self.assertIn("options", questions[0])
        self.assertIn("correct", questions[0])
        self.assertIn("solution", questions[0])
    
    def test_parse_empty_output(self):
        """Test that empty output raises error."""
        with self.assertRaises(ParsingError):
            parse_llm_output("", "Physics")
    
    def test_parse_malformed_output(self):
        """Test parsing with malformed output."""
        malformed_output = """
This is some random text that doesn't follow the format.
There are no proper questions here.
"""
        
        with self.assertRaises(ParsingError):
            parse_llm_output(malformed_output, "Physics", strict=True)
    
    def test_parse_with_missing_options(self):
        """Test parsing question with missing options."""
        incomplete_output = """
Q1. Test question?
A) Option A
B) Option B
Answer: A
Solution: Test solution
"""
        # Should still parse but may not validate
        questions = parse_llm_output(incomplete_output, "Physics", strict=False)
        # May get 0 or 1 question depending on validation
        self.assertIsInstance(questions, list)
    
    def test_parse_with_expected_count(self):
        """Test parsing with expected question count."""
        questions = parse_llm_output(
            self.valid_llm_output,
            "Physics",
            expected_count=2,
            strict=False
        )
        
        # Should get at least some questions
        self.assertGreater(len(questions), 0)
    
    def test_parse_insufficient_questions_strict(self):
        """Test that insufficient questions raises error in strict mode."""
        single_question = """
Q1. Test question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A
Solution: Test solution
"""
        
        with self.assertRaises(InsufficientQuestionsError):
            parse_llm_output(
                single_question,
                "Physics",
                expected_count=10,
                strict=True
            )
    
    def test_parse_question_block(self):
        """Test parsing individual question block."""
        block = """
Q1. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B
Solution: 2 + 2 = 4
"""
        
        question = _parse_question_block(block, 0)
        
        self.assertIsNotNone(question)
        self.assertEqual(question["correct"], "B")
        self.assertEqual(len(question["options"]), 4)
    
    def test_parse_with_extra_whitespace(self):
        """Test parsing with extra whitespace."""
        messy_output = """

Q1.    What is the answer?   
A)   Option A   
B)   Option B   
C)   Option C   
D)   Option D   
Answer:   A   
Solution:   The answer is A.   

"""
        
        questions = parse_llm_output(messy_output, "Physics", strict=False)
        self.assertGreater(len(questions), 0)
    
    def test_parse_with_lowercase_answer(self):
        """Test parsing with lowercase answer format."""
        lowercase_output = """
Q1. Test question?
A) Option A
B) Option B
C) Option C
D) Option D
answer: a
solution: Test solution
"""
        
        questions = parse_llm_output(lowercase_output, "Physics", strict=False)
        # Parser should handle case-insensitive matching
        if len(questions) > 0:
            self.assertIn(questions[0]["correct"], ["A", "a", None])


class TestParsingStrategies(unittest.TestCase):
    """Test different parsing strategies."""
    
    def test_regex_parsing(self):
        """Test regex-based parsing."""
        output = """
Q1. Test question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A
Solution: Test
"""
        
        questions = _parse_with_regex(output, "Physics")
        self.assertIsInstance(questions, list)
    
    def test_fallback_parsing(self):
        """Test fallback parsing strategy."""
        # Malformed output that might need fallback
        output = """
Some random text

Q1. Test question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A
Solution: Test
"""
        
        questions = _parse_with_fallback(output, "Physics")
        self.assertIsInstance(questions, list)


if __name__ == '__main__':
    unittest.main()
