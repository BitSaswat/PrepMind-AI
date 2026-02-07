#!/usr/bin/env python3
"""
Simple script to generate and save a PDF to the Desktop.
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_gen.question_generator import generate_questions
from ai_gen.pdf_utils import generate_question_pdf

def main():
    # Configuration
    exam = "JEE"
    subject_data = {
        "Physics": {
            "chapters": ["Kinematics", "Laws of Motion"],
            "num_questions": 5,
            "difficulty": "Medium"
        }
    }
    
    print("🤖 Generating questions with Gemini Flash...")
    
    # Generate questions - returns (questions_list, questions_by_subject)
    questions_list, questions_by_subject = generate_questions(exam, subject_data)
    
    print(f"✅ Generated {len(questions_list)} questions")
    
    # Create PDF
    print("📄 Creating PDF...")
    pdf_buffer = generate_question_pdf(questions_by_subject, 'JEE Physics Mock Test')
    
    # Save to Desktop
    output_path = "/Users/om/Desktop/JEE_Physics_Test.pdf"
    with open(output_path, 'wb') as f:
        f.write(pdf_buffer.getvalue())
    
    file_size = len(pdf_buffer.getvalue())
    print(f"\n✅ SUCCESS!")
    print(f"📄 PDF saved to: {output_path}")
    print(f"📊 File size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
    print(f"📝 Questions: {len(questions_list)}")
    print(f"📚 Subjects: Physics")

if __name__ == "__main__":
    main()
