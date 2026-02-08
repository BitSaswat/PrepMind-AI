import os
import sys
import json
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

try:
    from dotenv import load_dotenv
    # Adjust import path since we are in root but code expects to be run effectively from backend or with backend in path
    from backend.ai_gen import generate_questions
except ImportError as e:
    print(f"Error importing modules: {e}")
    # Try different path for ai_gen if running from root
    try:
        sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
        from ai_gen import generate_questions
    except ImportError:
        print("Still failed to import")
        sys.exit(1)

def main():
    # Load environment variables
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', '.env'))
    
    # Configuration for UPSC
    exam_type = "UPSC"
    subject_data = {
      'History': {
        "chapters": [],
        "num_questions": 2, # Reduced for quick testing
        "difficulty": 'Medium'
      },
      'Geography': {
        "chapters": [],
        "num_questions": 2,
        "difficulty": 'Medium'
      }
    }

    try:
        print(f"\nGenerating questions for {exam_type}...")
        
        # Generate questions
        questions, by_subject = generate_questions(exam_type, subject_data)
        
        print(f"\nSuccessfully generated {len(questions)} questions.")
        print(json.dumps(questions[0], indent=2))
        
    except Exception as e:
        print(f"\nError occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
