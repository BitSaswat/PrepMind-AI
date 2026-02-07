# backend/prompt.py

PROMPT_TEMPLATE = """
You are an expert {exam} question paper setter.

Generate {num_questions} MCQs from:
Subject: {subject}
Chapters: {chapters}
Difficulty: {difficulty}

Rules:
- Exam-level difficulty
- Exactly 4 options (A, B, C, D)
- Provide correct answer and a short solution

Format STRICTLY like this:

Q1. Question text
A) option
B) option
C) option
D) option
Answer: A
Solution: explanation
"""
