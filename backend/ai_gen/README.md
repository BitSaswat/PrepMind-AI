# AI Generation Module - Setup and Testing Guide

## Python Environment Setup

### Option 1: Using Virtual Environment (Recommended)
```bash
cd /Users/om/prep_mind_ai/PrepMind-AI/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Option 2: Using System Python with --user flag
```bash
cd /Users/om/prep_mind_ai/PrepMind-AI/backend
pip install --user -r requirements.txt
```

### Option 3: Using pipx (For isolated installations)
```bash
brew install pipx
pipx install python-dotenv
pipx install langchain-google-genai
pipx install reportlab
```

## Running Tests

### Run all tests
```bash
cd /Users/om/prep_mind_ai/PrepMind-AI/backend
python -m unittest discover -s ai_gen/tests -p "test_*.py" -v
```

### Run specific test file
```bash
python -m unittest ai_gen.tests.test_validators -v
python -m unittest ai_gen.tests.test_models -v
python -m unittest ai_gen.tests.test_parser -v
```

### Run with coverage (if pytest-cov installed)
```bash
pytest ai_gen/tests/ --cov=ai_gen --cov-report=html
```

## Module Usage

### Basic Usage
```python
from ai_gen import generate_questions, evaluate, generate_question_pdf

# Generate questions
subject_data = {
    "Physics": {
        "chapters": ["Kinematics", "Laws of Motion"],
        "num_questions": 10,
        "difficulty": "Medium"
    }
}

questions, by_subject = generate_questions("JEE", subject_data)

# Evaluate answers
user_answers = {0: "A", 1: "B", 2: None}
result = evaluate(questions, user_answers, "JEE")

# Generate PDF
pdf_buffer = generate_question_pdf(by_subject, "JEE Mock Test")
```

## Environment Variables

Create a `.env` file in the backend directory:
```
GEMINI_API_KEY=your_api_key_here
```

## Manual PDF Generation

To generate a sample PDF manually without running the full backend server:

1. Ensure your `.env` file is set up with a valid `GEMINI_API_KEY`.
2. Run the generator script:
```bash
cd /Users/om/prep_mind_ai/PrepMind-AI/backend
python run_generator.py
```
This will create a `generated_exam.pdf` file in the backend directory.


## Troubleshooting

### ModuleNotFoundError: No module named 'dotenv'
- Install dependencies using one of the options above
- Make sure you're in the correct directory
- Activate virtual environment if using one

### ImportError in tests
- Ensure all dependencies are installed
- Check Python path is correct
- Try running from the backend directory

### API Key Issues
- Ensure `.env` file exists in backend directory
- Check GEMINI_API_KEY is set correctly
- Verify API key is valid
