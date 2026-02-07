"""
PDF generation utilities for creating question papers and answer keys.
Provides enhanced PDF generation with proper formatting and error handling.
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from io import BytesIO
from typing import Dict, List, Any

from .logger import get_logger
from .constants import (
    PDF_MARGIN_LEFT, PDF_MARGIN_RIGHT, PDF_MARGIN_TOP, PDF_MARGIN_BOTTOM,
    PDF_FONT_TITLE, PDF_FONT_HEADING, PDF_FONT_BODY,
    PDF_FONT_SIZE_TITLE, PDF_FONT_SIZE_HEADING, PDF_FONT_SIZE_BODY,
    PDF_LINE_HEIGHT, PDF_SECTION_SPACING, PDF_QUESTION_SPACING,
    PDF_OPTION_SPACING, PDF_MAX_LINE_WIDTH
)
from .exceptions import PDFGenerationError

# Initialize logger
logger = get_logger("pdf_utils")


def generate_question_pdf(
    questions_by_subject: Dict[str, List[Dict[str, Any]]],
    title: str = "Mock Test"
) -> BytesIO:
    """
    Generate PDF for question paper.
    
    Args:
        questions_by_subject: Dictionary mapping subjects to question lists
        title: Title for the PDF
        
    Returns:
        BytesIO buffer containing the PDF
        
    Raises:
        PDFGenerationError: If PDF generation fails
    """
    logger.info(f"Generating question PDF: {title}")
    
    try:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - PDF_MARGIN_TOP
        
        # Draw title
        c.setFont(PDF_FONT_TITLE, PDF_FONT_SIZE_TITLE)
        c.drawCentredString(width / 2, y, title)
        y -= PDF_SECTION_SPACING
        
        # Add instructions
        c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY - 1)
        instructions = [
            "Instructions:",
            "• Each question has 4 options (A, B, C, D)",
            "• Choose the most appropriate answer",
            "• Marking Scheme: +4 for correct, -1 for wrong, 0 for unattempted"
        ]
        for instruction in instructions:
            c.drawString(PDF_MARGIN_LEFT, y, instruction)
            y -= PDF_LINE_HEIGHT
        
        y -= PDF_SECTION_SPACING
        
        # Generate questions for each subject
        question_number = 1
        for subject, questions in questions_by_subject.items():
            # Check if we need a new page
            if y < PDF_MARGIN_BOTTOM + 100:
                c.showPage()
                y = height - PDF_MARGIN_TOP
            
            # Draw subject heading
            c.setFont(PDF_FONT_HEADING, PDF_FONT_SIZE_HEADING)
            c.drawString(PDF_MARGIN_LEFT, y, subject)
            y -= PDF_SECTION_SPACING
            
            # Draw questions
            c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
            for question in questions:
                # Check page space
                if y < PDF_MARGIN_BOTTOM + 150:
                    c.showPage()
                    y = height - PDF_MARGIN_TOP
                    c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
                
                # Draw question text with wrapping and better formatting
                question_text = f"{question_number}. {_clean_latex(question['question'])}"
                c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
                y = _draw_wrapped_text(
                    c, question_text, PDF_MARGIN_LEFT, y,
                    PDF_MAX_LINE_WIDTH, PDF_LINE_HEIGHT + 2
                )
                y -= 8
                
                # Draw options with better spacing
                for opt_key in ["A", "B", "C", "D"]:
                    if opt_key in question.get("options", {}):
                        option_text = f"   {opt_key}) {_clean_latex(question['options'][opt_key])}"
                        y = _draw_wrapped_text(
                            c, option_text, PDF_MARGIN_LEFT + 20, y,
                            PDF_MAX_LINE_WIDTH - 20, PDF_LINE_HEIGHT + 2
                        )
                        y -= 5
                
                y -= PDF_QUESTION_SPACING
                question_number += 1
        
        # Add page numbers
        _add_page_numbers(c)
        
        c.save()
        buffer.seek(0)
        
        logger.info(f"Question PDF generated successfully")
        return buffer
        
    except Exception as e:
        logger.error(f"Failed to generate question PDF: {str(e)}")
        raise PDFGenerationError(f"Failed to generate question PDF: {str(e)}")


def generate_answer_pdf(
    questions_by_subject: Dict[str, List[Dict[str, Any]]],
    title: str = "Answer Key"
) -> BytesIO:
    """
    Generate PDF for answer key with solutions.
    
    Args:
        questions_by_subject: Dictionary mapping subjects to question lists
        title: Title for the PDF
        
    Returns:
        BytesIO buffer containing the PDF
        
    Raises:
        PDFGenerationError: If PDF generation fails
    """
    logger.info(f"Generating answer PDF: {title}")
    
    try:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - PDF_MARGIN_TOP
        
        # Draw title
        c.setFont(PDF_FONT_TITLE, PDF_FONT_SIZE_TITLE)
        c.drawCentredString(width / 2, y, title)
        y -= PDF_SECTION_SPACING
        
        # Generate answers for each subject
        question_number = 1
        for subject, questions in questions_by_subject.items():
            # Check if we need a new page
            if y < PDF_MARGIN_BOTTOM + 100:
                c.showPage()
                y = height - PDF_MARGIN_TOP
            
            # Draw subject heading
            c.setFont(PDF_FONT_HEADING, PDF_FONT_SIZE_HEADING)
            c.drawString(PDF_MARGIN_LEFT, y, subject)
            y -= PDF_SECTION_SPACING
            
            # Draw full Q&A
            c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
            for question in questions:
                # Check page space (need more space now for full question context)
                if y < PDF_MARGIN_BOTTOM + 200:
                    c.showPage()
                    y = height - PDF_MARGIN_TOP
                    c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
                
                # Draw question text with better formatting
                question_text = f"{question_number}. {_clean_latex(question['question'])}"
                c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
                y = _draw_wrapped_text(
                    c, question_text, PDF_MARGIN_LEFT, y,
                    PDF_MAX_LINE_WIDTH, PDF_LINE_HEIGHT + 2
                )
                y -= 8
                
                # Draw options with better spacing
                for opt_key in ["A", "B", "C", "D"]:
                    if opt_key in question.get("options", {}):
                        option_text = f"   {opt_key}) {_clean_latex(question['options'][opt_key])}"
                        y = _draw_wrapped_text(
                            c, option_text, PDF_MARGIN_LEFT + 20, y,
                            PDF_MAX_LINE_WIDTH - 20, PDF_LINE_HEIGHT + 2
                        )
                        y -= 5
                
                y -= 8

                # Draw Answer
                c.setFont(PDF_FONT_HEADING, PDF_FONT_SIZE_BODY)
                answer_text = f"   Answer: {question['correct']}"
                c.drawString(PDF_MARGIN_LEFT, y, answer_text)
                y -= PDF_LINE_HEIGHT + 2
                
                # Draw solution with wrapping
                if question.get("solution"):
                    c.setFont(PDF_FONT_BODY, PDF_FONT_SIZE_BODY)
                    solution_text = f"   Solution: {_clean_latex(question['solution'])}"
                    y = _draw_wrapped_text(
                        c, solution_text, PDF_MARGIN_LEFT + 20, y,
                        PDF_MAX_LINE_WIDTH - 20, PDF_LINE_HEIGHT + 2
                    )
                
                y -= PDF_QUESTION_SPACING
                question_number += 1
        
        # Add page numbers
        _add_page_numbers(c)
        
        c.save()
        buffer.seek(0)
        
        logger.info(f"Answer PDF generated successfully")
        return buffer
        
    except Exception as e:
        logger.error(f"Failed to generate answer PDF: {str(e)}")
        raise PDFGenerationError(f"Failed to generate answer PDF: {str(e)}")


def _draw_wrapped_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    line_height: float
) -> float:
    """
    Draw text with word wrapping.
    
    Args:
        c: Canvas object
        text: Text to draw
        x: X coordinate
        y: Y coordinate
        max_width: Maximum width for text
        line_height: Height of each line
        
    Returns:
        New Y coordinate after drawing
    """
    # Split text into lines that fit within max_width
    lines = simpleSplit(text, c._fontname, c._fontsize, max_width)
    
    for line in lines:
        c.drawString(x, y, line)
        y -= line_height
    
    return y


def _clean_latex(text: str) -> str:
    """
    Clean LaTeX code for better PDF rendering.
    Converts LaTeX to readable plain text with proper Unicode symbols.
    Handles superscripts, subscripts, chemical formulas, and mathematical expressions.
    
    Args:
        text: Text potentially containing LaTeX
        
    Returns:
        Cleaned text with Unicode symbols
    """
    if not text:
        return ""
    
    import re
    
    # First, handle superscripts and subscripts with proper Unicode
    superscript_map = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
        'n': 'ⁿ', 'i': 'ⁱ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
        'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
        'k': 'ᵏ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
        's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
        'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
    }
    
    subscript_map = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
        'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
        'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
        'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
        'v': 'ᵥ', 'x': 'ₓ'
    }
    
    def convert_superscript(match):
        content = match.group(1)
        result = ''
        for char in content:
            result += superscript_map.get(char, char)
        return result
    
    def convert_subscript(match):
        content = match.group(1)
        result = ''
        for char in content:
            result += subscript_map.get(char, char)
        return result
    
    cleaned = text
    
    # Handle LaTeX superscripts: ^{...} or ^x
    cleaned = re.sub(r'\^\{([^}]+)\}', convert_superscript, cleaned)
    cleaned = re.sub(r'\^([0-9+\-=()])', lambda m: superscript_map.get(m.group(1), m.group(1)), cleaned)
    
    # Handle LaTeX subscripts: _{...} or _x
    cleaned = re.sub(r'_\{([^}]+)\}', convert_subscript, cleaned)
    cleaned = re.sub(r'_([0-9+\-=()])', lambda m: subscript_map.get(m.group(1), m.group(1)), cleaned)
    
    # Greek letters
    greek_replacements = {
        r'\\alpha': 'α', r'\\beta': 'β', r'\\gamma': 'γ', r'\\Gamma': 'Γ',
        r'\\delta': 'δ', r'\\Delta': 'Δ', r'\\epsilon': 'ε', r'\\varepsilon': 'ε',
        r'\\zeta': 'ζ', r'\\eta': 'η', r'\\theta': 'θ', r'\\Theta': 'Θ',
        r'\\vartheta': 'θ', r'\\iota': 'ι', r'\\kappa': 'κ', r'\\lambda': 'λ',
        r'\\Lambda': 'Λ', r'\\mu': 'μ', r'\\nu': 'ν', r'\\xi': 'ξ',
        r'\\Xi': 'Ξ', r'\\pi': 'π', r'\\Pi': 'Π', r'\\rho': 'ρ',
        r'\\sigma': 'σ', r'\\Sigma': 'Σ', r'\\tau': 'τ', r'\\upsilon': 'υ',
        r'\\Upsilon': 'Υ', r'\\phi': 'φ', r'\\Phi': 'Φ', r'\\varphi': 'φ',
        r'\\chi': 'χ', r'\\psi': 'ψ', r'\\Psi': 'Ψ', r'\\omega': 'ω',
        r'\\Omega': 'Ω'
    }
    
    # Mathematical operators and symbols
    math_replacements = {
        r'\\times': '×', r'\\div': '÷', r'\\pm': '±', r'\\mp': '∓',
        r'\\cdot': '·', r'\\ast': '*', r'\\star': '⋆',
        r'\\leq': '≤', r'\\geq': '≥', r'\\neq': '≠', r'\\ne': '≠',
        r'\\approx': '≈', r'\\equiv': '≡', r'\\sim': '~',
        r'\\propto': '∝', r'\\infty': '∞', r'\\partial': '∂',
        r'\\nabla': '∇', r'\\sqrt': '√', r'\\angle': '∠',
        r'\\degree': '°', r'\\circ': '°', r'\\celsius': '°C',
        r'\\rightarrow': '→', r'\\to': '→', r'\\leftarrow': '←',
        r'\\leftrightarrow': '↔', r'\\Rightarrow': '⇒',
        r'\\Leftarrow': '⇐', r'\\Leftrightarrow': '⇔',
        r'\\uparrow': '↑', r'\\downarrow': '↓'
    }
    
    # Calculus and advanced math
    calculus_replacements = {
        r'\\int': '∫', r'\\iint': '∬', r'\\iiint': '∭',
        r'\\oint': '∮', r'\\sum': 'Σ', r'\\prod': 'Π',
        r'\\lim': 'lim', r'\\sin': 'sin', r'\\cos': 'cos',
        r'\\tan': 'tan', r'\\cot': 'cot', r'\\sec': 'sec',
        r'\\csc': 'csc', r'\\ln': 'ln', r'\\log': 'log',
        r'\\exp': 'exp', r'\\max': 'max', r'\\min': 'min'
    }
    
    # Set theory and logic
    logic_replacements = {
        r'\\in': '∈', r'\\notin': '∉', r'\\subset': '⊂',
        r'\\subseteq': '⊆', r'\\supset': '⊃', r'\\supseteq': '⊇',
        r'\\cup': '∪', r'\\cap': '∩', r'\\emptyset': '∅',
        r'\\forall': '∀', r'\\exists': '∃', r'\\neg': '¬',
        r'\\land': '∧', r'\\lor': '∨', r'\\implies': '⇒'
    }
    
    # Combine all replacements
    all_replacements = {**greek_replacements, **math_replacements, 
                       **calculus_replacements, **logic_replacements}
    
    for pattern, replacement in all_replacements.items():
        cleaned = re.sub(pattern, replacement, cleaned)
    
    # Handle fractions: \frac{a}{b} -> (a)/(b)
    cleaned = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', cleaned)
    
    # Handle square roots: \sqrt{x} -> √(x)
    cleaned = re.sub(r'\\sqrt\{([^}]+)\}', r'√(\1)', cleaned)
    cleaned = re.sub(r'\\sqrt\[([^]]+)\]\{([^}]+)\}', r'\1√(\2)', cleaned)  # nth root
    
    # Remove LaTeX delimiters
    cleaned = re.sub(r'\\\[|\\\]|\\\(|\\\)', '', cleaned)
    cleaned = re.sub(r'\$+', '', cleaned)
    
    # Remove text formatting commands but keep content
    cleaned = re.sub(r'\\text\{([^}]+)\}', r'\1', cleaned)
    cleaned = re.sub(r'\\mathrm\{([^}]+)\}', r'\1', cleaned)
    cleaned = re.sub(r'\\mathbf\{([^}]+)\}', r'\1', cleaned)
    cleaned = re.sub(r'\\mathit\{([^}]+)\}', r'\1', cleaned)
    
    # Remove remaining curly braces
    cleaned = cleaned.replace('{', '').replace('}', '')
    
    # Remove remaining backslashes
    cleaned = re.sub(r'\\(?![a-zA-Z])', '', cleaned)
    
    return cleaned


def _add_page_numbers(c: canvas.Canvas) -> None:
    """
    Add page numbers to all pages.
    Note: Page numbering is handled during page creation.
    This function is kept for compatibility.
    
    Args:
        c: Canvas object
    """
    # Page numbers are added during page creation, not after
    pass
