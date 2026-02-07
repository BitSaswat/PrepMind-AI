from backend.llm_service import call_llm
from backend.prompt import PROMPT_TEMPLATE
from backend.question_parser import parse_llm_output

def generate_questions(exam, subject_data):
    all_questions = []
    by_subject = {}
    qid = 0

    for subject, data in subject_data.items():
        prompt = PROMPT_TEMPLATE.format(
            exam=exam,
            subject=subject,
            chapters=", ".join(data["chapters"]),
            num_questions=data["num_questions"],
            difficulty=data["difficulty"]
        )

        raw = call_llm(prompt)
        parsed = parse_llm_output(raw, subject)
        parsed = parsed[:data["num_questions"]]   # enforce count

        by_subject[subject] = []

        for q in parsed:
            q["id"] = qid
            qid += 1
            all_questions.append(q)
            by_subject[subject].append(q)

    return all_questions, by_subject
