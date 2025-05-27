import re
from re import Pattern

# New data classes for structured sections
class EducationEntry:
    def __init__(self, degree, school, start_date=None, end_date=None, details=None):
        self.degree = degree
        self.school = school
        self.start_date = start_date
        self.end_date = end_date
        self.details = details or []

class ExperienceEntry:
    def __init__(self, company, position, start_date, end_date=None, bullet_points=None):
        self.company = company
        self.position = position
        self.start_date = start_date
        self.end_date = end_date
        self.bullet_points = bullet_points or []

class ProjectEntry:
    def __init__(self, title, description=None, bullet_points=None):
        self.title = title
        self.description = description
        self.bullet_points = bullet_points or []

class VolunteerExperienceEntry:
    def __init__(self, organization, role, start_date, end_date=None, bullet_points=None):
        self.organization = organization
        self.role = role
        self.start_date = start_date
        self.end_date = end_date
        self.bullet_points = bullet_points or []

class SkillSet:
    def __init__(self, technical=None, soft_skills=None):
        self.technical = technical or []
        self.soft_skills = soft_skills or []

class ParsedResume():
    """_summary_

    Args:
        Document (_type_): _description_
    """
    summary_regex = re.compile(r"(?:Professional Summary|Summary|Objective)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Experience|Work History|Skills|Education|Projects|$))", re.IGNORECASE | re.DOTALL)
    experience_regex = re.compile(r"(?:Work Experience|Professional Experience|Experience)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Education|Skills|Projects|Certifications|$))", re.IGNORECASE | re.DOTALL)
    job_entry_regex = re.compile(r"(?P<title>[A-Z][A-Za-z\s/&,-]+)\s*\n(?P<company>[A-Z][\w\s,&.-]+)?\n(?P<dates>\w+\s+\d{4}\s*[-–]\s*\w+\s+\d{4}|\w+\s+\d{4}\s*[-–]\s*Present)", re.IGNORECASE)
    volunteer_regex = re.compile(r"(?:Volunteer Experience|Community Involvement|Volunteering)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Projects|Skills|Education|$))", re.IGNORECASE | re.DOTALL)
    projects_regex = re.compile(r"(?:Projects|Selected Projects|Portfolio)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Skills|Education|Certifications|$))", re.IGNORECASE | re.DOTALL)
    education_regex = re.compile(r"(?:Education|Academic Background)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Skills|Certifications|Projects|$))", re.IGNORECASE | re.DOTALL)
    certifications_regex = re.compile(r"(?:Certifications|Licenses|Certificates)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Skills|Education|Projects|$))", re.IGNORECASE | re.DOTALL)

    def __init__(self, paragraphs):
        # Initialize resume properties with new structured data
        self.name = None
        self.email = None
        self.phone = None
        self.professional_summary = None
        
        # Store structured entries instead of plain text strings
        self.education = []             # list of EducationEntry
        self.certifications = []        # list of certifications strings (if not further structured)
        self.projects = []              # list of ProjectEntry
        self.volunteer_experience = []  # list of VolunteerExperienceEntry
        self.experience_section = []    # list of ExperienceEntry
        self.skills = SkillSet()        # structured skills: technical and soft skills
        
        self.format_info = {}
        self.parse_resume(paragraphs=paragraphs)
        
    def parse_resume(self, paragraphs):
        for p in paragraphs:
            text = p.text.strip()
            if not text:
                continue

            if self.name is None and len(text.split()) <= 4:
                self.name = text

            if self.email is None and '@' in text:
                self.email = text  # placeholder for proper extraction

            if self.phone is None and any(char.isdigit() for char in text):
                digits = ''.join(filter(str.isdigit, text))
                if len(digits) >= 10:
                    self.phone = text

            if self.professional_summary is None:
                ps = self.match_resume_text(ParsedResume.summary_regex, text)
                if ps:
                    self.professional_summary = ps

            exp_text = self.match_resume_text(ParsedResume.experience_regex, text)
            if exp_text:
                exp_entry = self.parse_experience_entry(exp_text)
                if exp_entry:
                    self.experience_section.append(exp_entry)

            edu_text = self.match_resume_text(ParsedResume.education_regex, text)
            if edu_text:
                edu_entry = self.parse_education_entry(edu_text)
                if edu_entry:
                    self.education.append(edu_entry)

            cert_text = self.match_resume_text(ParsedResume.certifications_regex, text)
            if cert_text:
                self.certifications.append(cert_text)

            proj_text = self.match_resume_text(ParsedResume.projects_regex, text)
            if proj_text:
                proj_entry = self.parse_project_entry(proj_text)
                if proj_entry:
                    self.projects.append(proj_entry)

            vol_text = self.match_resume_text(ParsedResume.volunteer_regex, text)
            if vol_text:
                vol_entry = self.parse_volunteer_entry(vol_text)
                if vol_entry:
                    self.volunteer_experience.append(vol_entry)

            if "Technical Skills" in text and "Soft Skills" in text:
                skills = self.parse_skill_set(text)
                if skills:
                    self.skills = skills

    def match_resume_text(self, regex: Pattern[str], text):
        m = regex.search(text)
        return m.group(1).strip() if m else None

    def parse_education_entry(self, text):
        m = re.search(r"(?P<degree>.+?),\s*(?P<school>.+?)(?:,\s*(?P<start>\d{4})\s*[-–]\s*(?P<end>\d{4}))?(?:,\s*(?P<details>.+))?$", text)
        if m:
            details = m.group("details").split(';') if m.group("details") else []
            return EducationEntry(m.group("degree").strip(), m.group("school").strip(), m.group("start"), m.group("end"), [d.strip() for d in details])
        return None

    def parse_experience_entry(self, text):
        m = re.search(r"(?P<position>.+?)\s+at\s+(?P<company>.+?),\s*(?P<start>\w+\s+\d{4})\s*[-–]\s*(?P<end>\w+\s+\d{4}|Present)(?:,\s*(?P<bullets>.+))?$", text)
        if m:
            bullets = m.group("bullets").split(';') if m.group("bullets") else []
            return ExperienceEntry(m.group("company").strip(), m.group("position").strip(), m.group("start").strip(), m.group("end").strip(), [b.strip() for b in bullets])
        return None

    def parse_project_entry(self, text):
        m = re.search(r"(?P<title>.+?)\s*-\s*(?P<description>.+?)(?:,\s*(?P<bullets>.+))?$", text)
        if m:
            bullets = m.group("bullets").split(';') if m.group("bullets") else []
            return ProjectEntry(m.group("title").strip(), m.group("description").strip(), [b.strip() for b in bullets])
        return None

    def parse_volunteer_entry(self, text):
        m = re.search(r"(?P<role>.+?)\s+at\s+(?P<organization>.+?),\s*(?P<start>\w+\s+\d{4})\s*[-–]\s*(?P<end>\w+\s+\d{4}|Present)(?:,\s*(?P<bullets>.+))?$", text)
        if m:
            bullets = m.group("bullets").split(';') if m.group("bullets") else []
            return VolunteerExperienceEntry(m.group("organization").strip(), m.group("role").strip(), m.group("start").strip(), m.group("end").strip(), [b.strip() for b in bullets])
        return None

    def parse_skill_set(self, text):
        m = re.search(r"Technical Skills\s*:\s*(?P<tech>.+?)\s*;\s*Soft Skills\s*:\s*(?P<soft>.+)", text, re.IGNORECASE)
        if m:
            technical = [s.strip() for s in m.group("tech").split(',')]
            soft = [s.strip() for s in m.group("soft").split(',')]
            return SkillSet(technical, soft)
        return None

    def serialize(self):
        import json
        data = {
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "professional_summary": self.professional_summary,
            "education": [{
                "degree": e.degree,
                "school": e.school,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "details": e.details
            } for e in self.education],
            "certifications": self.certifications,
            "experience_section": [{
                "company": ex.company,
                "position": ex.position,
                "start_date": ex.start_date,
                "end_date": ex.end_date,
                "bullet_points": ex.bullet_points
            } for ex in self.experience_section],
            "projects": [{
                "title": p.title,
                "description": p.description,
                "bullet_points": p.bullet_points
            } for p in self.projects],
            "volunteer_experience": [{
                "organization": v.organization,
                "role": v.role,
                "start_date": v.start_date,
                "end_date": v.end_date,
                "bullet_points": v.bullet_points
            } for v in self.volunteer_experience],
            "skills": {
                "technical": self.skills.technical,
                "soft_skills": self.skills.soft_skills
            }
        }
        return json.dumps(data)