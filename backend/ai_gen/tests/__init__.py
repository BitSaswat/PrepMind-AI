"""
Comprehensive test suite for the AI generation module.

Tests cover:
- Validators
- Models
- Parsers
- LLM service
- Question generation
- Evaluation
- PDF generation
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
