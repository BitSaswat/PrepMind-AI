import os
import sys
import json
from pathlib import Path

# Add the current directory to Python path to ensure imports work correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from dotenv import load_dotenv
    from ai_gen import generate_questions, generate_question_pdf
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please make sure you have installed the requirements:")
    print("pip install -r requirements.txt")
    sys.exit(1)

def main():
    # Load environment variables
    load_dotenv()
    
    if not os.getenv("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY not found in environment variables.")
        print("Please create a .env file with your API key.")
        sys.exit(1)

    print("=== AI Question Generator Manual Run ===")
    
    # Configuration for the exam
    exam_type = "JEE"
    subject_data = {
        "Physics": {
            "chapters": ["Kinematics", "Laws of Motion"],
            "num_questions": 5,
            "difficulty": "Medium"
        },
        "Chemistry": {
            "chapters": ["Atomic Structure", "Chemical Bonding"],
            "num_questions": 5,
            "difficulty": "Medium"
        },
        "Mathematics": {
            "chapters": ["Quadratic Equations", "Sequences and Series"],
            "num_questions": 5,
            "difficulty": "Medium"
        }
    }

    try:
        print(f"\nGenerating questions for {exam_type}...")
        print(f"Subjects: {', '.join(subject_data.keys())}")
        
        # Generate questions
        questions, by_subject = generate_questions(exam_type, subject_data)
        
        print(f"\nSuccessfully generated {len(questions)} questions.")
        
        # Generate PDF
        print("\nGenerating PDF...")
        pdf_buffer = generate_question_pdf(by_subject, f"{exam_type} Practice Test")
        
        # Save to file
        output_filename = "generated_exam.pdf"
        with open(output_filename, "wb") as f:
            f.write(pdf_buffer.getvalue())
            
        print(f"\nSuccess! PDF saved to: {os.path.abspath(output_filename)}")
        
    except Exception as e:
        print(f"\nError occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
