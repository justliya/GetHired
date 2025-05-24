from docx.document import Document
import io



# New class for holding detailed resume information
class ParsedResume(Document):
    """_summary_

    Args:
        Document (_type_): _description_
    """
    def __init__(self, filepath):
        # Initialize resume properties
        self.name = None
        self.email = None
        self.phone = None
        self.professional_summary = None
        self.education = []
        self.certifications = []
        self.projects = []
        self.volunteer_experience = []
        self.experience_section = []
        self.skills = []
        self.format_info = {}
        self.parse_resume()

    def parse_resume(self):
        # Enhanced parsing logic (placeholders)
        for p in self.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            # Assume the first short paragraph is the name
            if self.name is None and len(text.split()) <= 4:
                self.name = text
            # Identify email from text containing '@'
            if self.email is None and '@' in text:
                self.email = text  # placeholder for proper extraction
            # Identify phone based on digit count
            if self.phone is None and any(char.isdigit() for char in text):
                digits = ''.join(filter(str.isdigit, text))
                if len(digits) >= 10:
                    self.phone = text  # placeholder for proper formatting
            # Identify professional summary section
            if self.professional_summary is None and "Professional Summary" in text:
                self.professional_summary = text
            # Gather education details
            if "Education" in text:
                self.education.append(text)  # placeholder: extend as needed
            # Gather certifications
            if "Certification" in text or "Certifications" in text:
                self.certifications.append(text)
            # Gather projects information
            if "Project" in text:
                self.projects.append(text)
            # Gather volunteer or experience details
            if "Volunteer" in text or ("Experience" in text and "Professional Summary" not in text):
                self.volunteer_experience.append(text)
            # ...additional parsing logic...