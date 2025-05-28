from docx import Document
from docxtpl import DocxTemplate
from .parse import ParsedResume

def load_resume_job_desc():
    doc = Document('docs/LaKaleigh_Harris_Resume.docx')
    doc_content = [p.text.strip() for p in doc.paragraphs]
    with open('docs/job_post.txt', 'r', encoding='utf-8') as f:
        job_content = f.read()
    return doc_content, job_content

def create_formatted_resume(text: str):
    candidate = ParsedResume(text).serialize()
    doc = DocxTemplate("docs\\templateResumeDoc.docx")
    doc.render(candidate)
    #TODO In the near future upload this to Firestore or GCS
    # Generate a temp file name 
    doc.save('docs/test-resume.docx')