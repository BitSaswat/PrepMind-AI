"""
Unit tests for data models.
Tests model creation, validation, and serialization.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ai_gen.models import (
    Question, SubjectConfig, ExamConfig, QuestionAttempt,
    SubjectResult, EvaluationResult, MarkingScheme,
    ExamType, Difficulty, AnswerOption
)


class TestEnums(unittest.TestCase):
    """Test enum definitions."""
    
    def test_exam_type_enum(self):
        """Test ExamType enum."""
        self.assertEqual(ExamType.JEE.value, "JEE")
        self.assertEqual(ExamType.NEET.value, "NEET")
    
    def test_difficulty_enum(self):
        """Test Difficulty enum."""
        self.assertEqual(Difficulty.EASY.value, "Easy")
        self.assertEqual(Difficulty.MEDIUM.value, "Medium")
        self.assertEqual(Difficulty.HARD.value, "Hard")
    
    def test_answer_option_enum(self):
        """Test AnswerOption enum."""
        self.assertEqual(AnswerOption.A.value, "A")
        self.assertEqual(AnswerOption.B.value, "B")
        self.assertEqual(AnswerOption.C.value, "C")
        self.assertEqual(AnswerOption.D.value, "D")


class TestQuestion(unittest.TestCase):
    """Test Question model."""
    
    def test_question_creation_valid(self):
        """Test creating a valid question."""
        question = Question(
            id=0,
            subject="Physics",
            question="What is the SI unit of force?",
            options={"A": "Newton", "B": "Joule", "C": "Watt", "D": "Pascal"},
            correct="A",
            solution="The SI unit of force is Newton (N)."
        )
        
        self.assertEqual(question.id, 0)
        self.assertEqual(question.subject, "Physics")
        self.assertEqual(question.correct, "A")
        self.assertEqual(len(question.options), 4)
    
    def test_question_invalid_correct_answer(self):
        """Test that invalid correct answer raises error."""
        with self.assertRaises(ValueError):
            Question(
                id=0,
                subject="Physics",
                question="Test?",
                options={"A": "1", "B": "2", "C": "3", "D": "4"},
                correct="E",  # Invalid
                solution="Test"
            )
    
    def test_question_invalid_options_count(self):
        """Test that wrong number of options raises error."""
        with self.assertRaises(ValueError):
            Question(
                id=0,
                subject="Physics",
                question="Test?",
                options={"A": "1", "B": "2"},  # Only 2 options
                correct="A",
                solution="Test"
            )
    
    def test_question_to_dict(self):
        """Test question serialization to dict."""
        question = Question(
            id=0,
            subject="Physics",
            question="Test?",
            options={"A": "1", "B": "2", "C": "3", "D": "4"},
            correct="A",
            solution="Test solution"
        )
        
        q_dict = question.to_dict()
        self.assertIsInstance(q_dict, dict)
        self.assertEqual(q_dict["id"], 0)
        self.assertEqual(q_dict["subject"], "Physics")


class TestSubjectConfig(unittest.TestCase):
    """Test SubjectConfig model."""
    
    def test_subject_config_creation(self):
        """Test creating subject configuration."""
        config = SubjectConfig(
            subject="Physics",
            chapters=["Kinematics", "Laws of Motion"],
            num_questions=10,
            difficulty="Medium"
        )
        
        self.assertEqual(config.subject, "Physics")
        self.assertEqual(len(config.chapters), 2)
        self.assertEqual(config.num_questions, 10)
    
    def test_subject_config_invalid_num_questions(self):
        """Test that invalid num_questions raises error."""
        with self.assertRaises(ValueError):
            SubjectConfig(
                subject="Physics",
                chapters=["Kinematics"],
                num_questions=0,  # Invalid
                difficulty="Medium"
            )
    
    def test_subject_config_empty_chapters(self):
        """Test that empty chapters list raises error."""
        with self.assertRaises(ValueError):
            SubjectConfig(
                subject="Physics",
                chapters=[],  # Empty
                num_questions=10,
                difficulty="Medium"
            )


class TestExamConfig(unittest.TestCase):
    """Test ExamConfig model."""
    
    def test_exam_config_creation(self):
        """Test creating exam configuration."""
        subjects = [
            SubjectConfig("Physics", ["Kinematics"], 10, "Medium"),
            SubjectConfig("Chemistry", ["Thermodynamics"], 10, "Medium")
        ]
        
        config = ExamConfig(
            exam_type=ExamType.JEE,
            subjects=subjects,
            total_duration=180
        )
        
        self.assertEqual(config.exam_type, ExamType.JEE)
        self.assertEqual(len(config.subjects), 2)
        self.assertEqual(config.total_duration, 180)
    
    def test_exam_config_get_total_questions(self):
        """Test getting total questions count."""
        subjects = [
            SubjectConfig("Physics", ["Kinematics"], 10, "Medium"),
            SubjectConfig("Chemistry", ["Thermodynamics"], 15, "Medium")
        ]
        
        config = ExamConfig(
            exam_type=ExamType.JEE,
            subjects=subjects
        )
        
        self.assertEqual(config.get_total_questions(), 25)


class TestQuestionAttempt(unittest.TestCase):
    """Test QuestionAttempt model."""
    
    def test_question_attempt_correct(self):
        """Test correct answer attempt."""
        attempt = QuestionAttempt(
            question_id=0,
            user_answer="A",
            time_taken=30.5
        )
        
        self.assertTrue(attempt.is_correct("A"))
        self.assertFalse(attempt.is_correct("B"))
        self.assertTrue(attempt.is_attempted())
    
    def test_question_attempt_unattempted(self):
        """Test unattempted question."""
        attempt = QuestionAttempt(
            question_id=0,
            user_answer=None
        )
        
        self.assertFalse(attempt.is_attempted())
        self.assertFalse(attempt.is_correct("A"))


class TestSubjectResult(unittest.TestCase):
    """Test SubjectResult model."""
    
    def test_subject_result_accuracy_calculation(self):
        """Test automatic accuracy calculation."""
        result = SubjectResult(
            subject="Physics",
            total_questions=10,
            attempted=8,
            correct=6,
            wrong=2,
            unattempted=2,
            marks_obtained=22.0,  # 6*4 - 2*1
            max_marks=40.0  # 10*4
        )
        
        self.assertEqual(result.accuracy, 75.0)  # 6/8 * 100
    
    def test_subject_result_zero_attempted(self):
        """Test accuracy when no questions attempted."""
        result = SubjectResult(
            subject="Physics",
            total_questions=10,
            attempted=0,
            correct=0,
            wrong=0,
            unattempted=10,
            marks_obtained=0.0,
            max_marks=40.0
        )
        
        self.assertEqual(result.accuracy, 0.0)


class TestMarkingScheme(unittest.TestCase):
    """Test MarkingScheme model."""
    
    def test_marking_scheme_calculate_marks(self):
        """Test marks calculation."""
        scheme = MarkingScheme(correct=4, wrong=-1, unattempted=0)
        
        marks = scheme.calculate_marks(
            correct_count=5,
            wrong_count=2,
            unattempted_count=3
        )
        
        self.assertEqual(marks, 18.0)  # 5*4 + 2*(-1) + 3*0


class TestEvaluationResult(unittest.TestCase):
    """Test EvaluationResult model."""
    
    def test_evaluation_result_creation(self):
        """Test creating evaluation result."""
        subject_results = [
            SubjectResult("Physics", 10, 8, 6, 2, 2, 22.0, 40.0)
        ]
        
        result = EvaluationResult(
            total_marks=22.0,
            positive_marks=24.0,
            negative_marks=2.0,
            total_questions=10,
            attempted=8,
            correct=6,
            wrong=2,
            unattempted=2,
            accuracy=75.0,
            subject_results=subject_results,
            question_details=[]
        )
        
        self.assertEqual(result.total_marks, 22.0)
        self.assertEqual(result.accuracy, 75.0)
        self.assertEqual(len(result.subject_results), 1)
    
    def test_evaluation_result_get_subject_result(self):
        """Test getting result for specific subject."""
        subject_results = [
            SubjectResult("Physics", 10, 8, 6, 2, 2, 22.0, 40.0),
            SubjectResult("Chemistry", 10, 7, 5, 2, 3, 18.0, 40.0)
        ]
        
        result = EvaluationResult(
            total_marks=40.0,
            positive_marks=44.0,
            negative_marks=4.0,
            total_questions=20,
            attempted=15,
            correct=11,
            wrong=4,
            unattempted=5,
            accuracy=73.3,
            subject_results=subject_results,
            question_details=[]
        )
        
        physics_result = result.get_subject_result("Physics")
        self.assertIsNotNone(physics_result)
        self.assertEqual(physics_result.subject, "Physics")
        
        invalid_result = result.get_subject_result("Biology")
        self.assertIsNone(invalid_result)


if __name__ == '__main__':
    unittest.main()
