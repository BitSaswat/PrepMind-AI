from backend.exam_config import MARKING_SCHEME

def evaluate(questions, user_answers, exam):
    scheme = MARKING_SCHEME[exam]

    total = positive = negative = 0
    details = []

    for q in questions:
        user = user_answers.get(q["id"])
        correct = q["correct"]

        if user == correct:
            marks = scheme["correct"]
            positive += marks
        elif user is None:
            marks = scheme["unattempted"]
        else:
            marks = scheme["wrong"]
            negative += abs(marks)

        total += marks

        details.append({
            "subject": q["subject"],
            "your": user,
            "correct": correct,
            "marks": marks,
            "solution": q["solution"]
        })

    return {
        "total": total,
        "positive": positive,
        "negative": negative,
        "details": details
    }
