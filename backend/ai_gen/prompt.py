"""
Enhanced prompt templates for question generation.
Provides structured prompts with examples and clear formatting instructions.
"""

# Base prompt template with improved structure
PROMPT_TEMPLATE = """You are an expert {exam} question paper setter with deep knowledge of {subject}.

**Task**: Generate {num_questions} high-quality Multiple Choice Questions (MCQs).

**Specifications**:
- Subject: {subject}
- Chapters: {chapters}
- Difficulty Level: {difficulty}
- Exam Standard: {exam} (Indian competitive exam)

**Quality Requirements**:
1. Questions must be exam-level difficulty and conceptually accurate
2. Each question must test a specific concept or application
3. All 4 options should be plausible to avoid obvious elimination
4. Solutions must be clear, concise, and educationally valuable
5. Avoid ambiguous wording or trick questions
6. Use LaTeX for chemical formulas and math (e.g., $H_2O$, $Na^+$, $x^2$)
7. Use Markdown italics for biological names (e.g., *Homo sapiens*, *Volvox*)

**Strict Format** (Follow EXACTLY):

Q1. [Clear, specific question text]
A) [First option]
B) [Second option]
C) [Third option]
D) [Fourth option]
Answer: [A/B/C/D]
Solution: [Brief explanation of why the answer is correct]

Q2. [Next question...]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [A/B/C/D]
Solution: [explanation]

**Important Notes**:
- **CRITICAL**: Generate EXACTLY {num_questions} questions - NO MORE, NO LESS
- This is a strict requirement: {num_questions} questions only
- Number questions sequentially (Q1, Q2, Q3, ...)
- Use EXACTLY the format shown above
- Include all 4 options (A, B, C, D) for every question
- Provide the correct answer letter (A, B, C, or D)
- Keep solutions under 100 words
- Do not include any extra text, headers, or commentary
- **STOP IMMEDIATELY after Q{num_questions}** - do not continue beyond this point

Generate EXACTLY {num_questions} questions now (Q1 through Q{num_questions}):
"""


# Numerical Answer Type prompt template for JEE
NUMERICAL_PROMPT_TEMPLATE = """You are an expert {exam} question paper setter with deep knowledge of {subject}.

**Task**: Generate {num_questions} high-quality Numerical Answer Type (NAT) questions.

**Specifications**:
- Subject: {subject}
- Chapters: {chapters}
- Difficulty Level: {difficulty}
- Exam Standard: {exam} (Indian competitive exam)
- Question Type: Numerical Answer Type (integer answer)

**Quality Requirements**:
1. Questions must be exam-level difficulty and conceptually accurate
2. Each question must test calculation, application, or problem-solving skills
3. Answer must be a single integer (round to nearest integer if needed)
4. Question should clearly specify units and what to calculate
5. Solutions must show step-by-step calculation
6. Use LaTeX for math expressions (e.g., $x^2$, $\\frac{{a}}{{b}}$, $\\sqrt{{x}}$)

**Strict Format** (Follow EXACTLY):

Q1. [Clear, specific question text with units specified]
Answer: [single integer value]
Solution: [Step-by-step calculation showing how to arrive at the answer]

Q2. [Next question...]
Answer: [integer]
Solution: [calculation steps]

**Important Notes**:
- **CRITICAL**: Generate EXACTLY {num_questions} questions - NO MORE, NO LESS
- This is a strict requirement: {num_questions} questions only
- Number questions sequentially (Q1, Q2, Q3, ...)
- Use EXACTLY the format shown above
- **NO OPTIONS** (A, B, C, D) - this is numerical answer type
- Answer must be a SINGLE INTEGER only (e.g., "Answer: 42")
- If calculation gives decimal, round to nearest integer
- Clearly specify units in the question
- Keep solutions under 150 words
- Do not include any extra text, headers, or commentary
- **STOP IMMEDIATELY after Q{num_questions}** - do not continue beyond this point

Generate EXACTLY {num_questions} numerical questions now (Q1 through Q{num_questions}):
"""



# Difficulty-specific prompt modifiers
DIFFICULTY_MODIFIERS = {
    "Easy": """
Focus on:
- Basic concepts and definitions
- Direct application of formulas
- Recall-based questions
- Fundamental understanding
""",
    
    "Medium": """
Focus on:
- Application of concepts
- Multi-step problem solving
- Conceptual understanding
- Standard exam-level difficulty
""",
    
    "Hard": """
Focus on:
- Complex problem solving
- Integration of multiple concepts
- Advanced applications
- Analytical and critical thinking
- Tricky but fair scenarios
"""
}


# Few-shot examples for better consistency
FEW_SHOT_EXAMPLES = {
    "Physics": """
**Example Question**:

Q1. A particle moves in a straight line with constant acceleration. If it covers 40 m in the 5th second of its motion, what is its acceleration? (Assume initial velocity = 0)
A) 4 m/s²
B) 8 m/s²
C) 16 m/s²
D) 20 m/s²
Answer: C
Solution: Distance covered in nth second = u + a(n - 0.5). Here u=0, n=5, s=40. So 40 = 0 + a(5-0.5) = 4.5a. Therefore a = 40/4.5 ≈ 8.89 m/s². Wait, let me recalculate: sₙ = u + (a/2)(2n-1). 40 = 0 + (a/2)(10-1) = 4.5a, so a = 8.89 m/s². The closest answer is 8 m/s².
""",
    
    "Chemistry": """
**Example Question**:

Q1. Which of the following has the highest lattice energy?
A) NaCl
B) NaF
C) NaBr
D) NaI
Answer: B
Solution: Lattice energy is inversely proportional to the sum of ionic radii. F⁻ has the smallest ionic radius among the halides, so NaF has the highest lattice energy.
""",
    
    "Mathematics": """
**Example Question**:

Q1. What is the derivative of f(x) = x³ + 2x² - 5x + 7?
A) 3x² + 4x - 5
B) 3x² + 2x - 5
C) x² + 4x - 5
D) 3x² + 4x + 5
Answer: A
Solution: Using power rule: d/dx(x³) = 3x², d/dx(2x²) = 4x, d/dx(-5x) = -5, d/dx(7) = 0. Therefore f'(x) = 3x² + 4x - 5.
""",
    
    "Botany": """
**Example Question**:

Q1. Which of the following is not a feature of plasmids?
A) Circular structure
B) Transferable
C) Single-stranded
D) Independent replication
Answer: C
Solution: Plasmids are extra-chromosomal, self-replicating, circular, double-stranded DNA molecules found in bacteria. They are not single-stranded.
""",

    "Zoology": """
**Example Question**:

Q1. Which of the following immunoglobulins does constitute the largest percentage in human milk?
A) IgA
B) IgG
C) IgD
D) IgM
Answer: A
Solution: IgA is the secretory antibody present in colostrum (human milk). It provides passive immunity to the infant. IgG is the most abundant in serum.
"""
}


def get_enhanced_prompt(
    exam: str,
    subject: str,
    chapters: str,
    num_questions: int,
    difficulty: str
) -> str:
    """
    Get enhanced prompt with difficulty modifiers and examples.
    
    Args:
        exam: Exam type
        subject: Subject name
        chapters: Comma-separated chapter names
        num_questions: Number of questions to generate
        difficulty: Difficulty level
        
    Returns:
        Enhanced prompt string
    """
    base_prompt = PROMPT_TEMPLATE.format(
        exam=exam,
        subject=subject,
        chapters=chapters,
        num_questions=num_questions,
        difficulty=difficulty
    )
    
    # Add difficulty modifier
    if difficulty in DIFFICULTY_MODIFIERS:
        base_prompt = base_prompt + "\n" + DIFFICULTY_MODIFIERS[difficulty]
    
    # Add subject-specific example if available
    if subject in FEW_SHOT_EXAMPLES:
        base_prompt = base_prompt + "\n" + FEW_SHOT_EXAMPLES[subject]
    
    return base_prompt
