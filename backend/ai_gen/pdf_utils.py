from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from io import BytesIO

def generate_question_pdf(questions_by_subject, title):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 50

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y, title)
    y -= 40

    for subject, questions in questions_by_subject.items():
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, subject)
        y -= 25

        c.setFont("Helvetica", 11)
        for i, q in enumerate(questions, 1):
            if y < 80:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 11)

            c.drawString(40, y, f"{i}. {q['question']}")
            y -= 18
            for opt, text in q["options"].items():
                c.drawString(60, y, f"{opt}) {text}")
                y -= 15
            y -= 10

    c.save()
    buffer.seek(0)
    return buffer


def generate_answer_pdf(questions_by_subject, title):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 50

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y, title)
    y -= 40

    for subject, questions in questions_by_subject.items():
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, subject)
        y -= 25

        c.setFont("Helvetica", 11)
        for i, q in enumerate(questions, 1):
            if y < 100:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 11)

            c.drawString(40, y, f"{i}. {q['question']}")
            y -= 18
            c.drawString(60, y, f"Answer: {q['correct']}")
            y -= 15
            c.drawString(60, y, f"Solution: {q['solution']}")
            y -= 25

    c.save()
    buffer.seek(0)
    return buffer
