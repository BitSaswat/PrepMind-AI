import re

def parse_llm_output(text, subject):
    blocks = re.split(r'\n(?=Q\d+\.)', text.strip())
    questions = []

    for i, block in enumerate(blocks):
        answer_match = re.search(r'Answer:\s*([A-D])', block)
        solution_match = re.search(r'Solution:\s*(.*)', block, re.S)

        clean_text = re.sub(r'Answer:\s*[A-D]', '', block)
        clean_text = re.sub(r'Solution:\s*.*', '', clean_text, flags=re.S)

        options = {}
        for opt in ["A", "B", "C", "D"]:
            m = re.search(rf'{opt}\)\s*(.*)', clean_text)
            if m:
                options[opt] = m.group(1).strip()

        question_line = clean_text.split("\n")[0]

        questions.append({
            "id": i,
            "subject": subject,
            "question": question_line,
            "options": options,
            "correct": answer_match.group(1) if answer_match else None,
            "solution": solution_match.group(1).strip() if solution_match else ""
        })

    return questions
# =================================================