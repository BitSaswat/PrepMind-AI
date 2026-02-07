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
                
                # Draw question text with wrapping
                question_text = f"{question_number}. {question['question']}"
                y = _draw_wrapped_text(
                    c, question_text, PDF_MARGIN_LEFT, y,
                    PDF_MAX_LINE_WIDTH, PDF_LINE_HEIGHT
                )
                y -= 5
                
                # Draw options
                for opt_key in ["A", "B", "C", "D"]:
                    if opt_key in question.get("options", {}):
                        option_text = f"   {opt_key}) {question['options'][opt_key]}"
                        y = _draw_wrapped_text(
                            c, option_text, PDF_MARGIN_LEFT + 20, y,
                            PDF_MAX_LINE_WIDTH - 20, PDF_LINE_HEIGHT
                        )
                        y -= 3
                
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
                
                # Draw question text with wrapping
                question_text = f"{question_number}. {question['question']}"
                y = _draw_wrapped_text(
                    c, question_text, PDF_MARGIN_LEFT, y,
                    PDF_MAX_LINE_WIDTH, PDF_LINE_HEIGHT
                )
                y -= 5
                
                # Draw options
                for opt_key in ["A", "B", "C", "D"]:
                    if opt_key in question.get("options", {}):
                        option_text = f"   {opt_key}) {question['options'][opt_key]}"
                        y = _draw_wrapped_text(
                            c, option_text, PDF_MARGIN_LEFT + 20, y,
                            PDF_MAX_LINE_WIDTH - 20, PDF_LINE_HEIGHT
                        )
                        y -= 3
                
                y -= 5

                # Draw Answer
                answer_text = f"   Answer: {question['correct']}"
                c.drawString(PDF_MARGIN_LEFT, y, answer_text)
                y -= PDF_LINE_HEIGHT
                
                # Draw solution with wrapping
                if question.get("solution"):
                    solution_text = f"   Solution: {question['solution']}"
                    y = _draw_wrapped_text(
                        c, solution_text, PDF_MARGIN_LEFT + 20, y,
                        PDF_MAX_LINE_WIDTH - 20, PDF_LINE_HEIGHT
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
