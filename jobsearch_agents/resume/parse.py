import re
from re import Pattern

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
    """
    ParsedResume is a class for extracting and structuring information from a resume text.
    
    This class parses a resume's raw text and organizes its contents into structured fields,
    such as contact information, education, work experience, certifications, projects, volunteer
    experience, and skills. It provides methods for extracting and parsing each section using 
    regular expressions and helper functions, and supports serialization to JSON for downstream 
    processing.
    
    Attributes:
        name (str): The candidate's full name.
        email (str): The candidate's email address.
        phone (str): The candidate's phone number.
        professional_summary (str): A summary statement or objective from the resume.
        education (list[EducationEntry]): List of EducationEntry objects representing educational background.
        certifications (list[str]): List of certification strings.
        projects (list[ProjectEntry]): List of ProjectEntry objects representing projects.
        volunteer_experience (list[VolunteerExperienceEntry]): List of VolunteerExperienceEntry objects.
        experience_section (list[ExperienceEntry]): List of ExperienceEntry objects representing work experience.
        skills (SkillSet): Structured representation of technical and soft skills.
        format_info (dict): Additional formatting or metadata information.
    
    Methods:
        __init__(resume: str):
            Initializes the ParsedResume object and parses the provided resume text.
        
        parse_resume(text: str):
            Extracts and populates all structured fields from the resume text.
        
        match_resume_text(regex: Pattern[str], text: str) -> str:
            Utility method to match and extract text using a regex pattern.
        
        parse_education_entry(text: str) -> EducationEntry:
            Parses a single education entry from the given text.
        
        extract_contact_info(text: str) -> dict:
            Extracts contact information (name, email, phone, URLs) from the text.
        
        extract_professional_summary(text: str) -> str:
            Extracts the professional summary section from the resume text.
        
        parse_experience_entry(text: str) -> ExperienceEntry:
            Parses a single work experience entry from the given text.
        
        parse_project_entry(text: str) -> ProjectEntry:
            Parses a single project entry from the given text.
        
        parse_volunteer_entry(text: str) -> VolunteerExperienceEntry:
            Parses a single volunteer experience entry from the given text.
        
        parse_skill_set(text: str) -> SkillSet:
            Extracts and structures the skills section from the given text.
        
        serialize() -> str:
            Serializes the parsed resume data into a JSON string.
    """
    summary_regex = re.compile(r"(?:Professional Summary|Summary|Objective)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Experience|Work History|Skills|Education|Projects|$))", re.IGNORECASE | re.DOTALL)
    experience_regex = re.compile(r"(?:Work Experience|Professional Experience|Experience)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Education|Skills|Projects|Certifications|$))", re.IGNORECASE | re.DOTALL)
    job_entry_regex = re.compile(r"(?P<title>[A-Z][A-Za-z\s/&,-]+)\s*\n(?P<company>[A-Z][\w\s,&.-]+)?\n(?P<dates>\w+\s+\d{4}\s*[-–]\s*\w+\s+\d{4}|\w+\s+\d{4}\s*[-–]\s*Present)", re.IGNORECASE)
    volunteer_regex = re.compile(r"(?:Volunteer Experience|Community Involvement|Volunteering)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Projects|Skills|Education|$))", re.IGNORECASE | re.DOTALL)
    projects_regex = re.compile(r"(?:Projects|Selected Projects|Portfolio)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Skills|Education|Certifications|$))", re.IGNORECASE | re.DOTALL)
    education_regex = re.compile(r"(?:Education|Academic Background)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Skills|Certifications|Projects|$))", re.IGNORECASE | re.DOTALL)
    certifications_regex = re.compile(r"(?:Certifications|Licenses|Certificates)\s*[:\-]?\s*(.*?)\n(?:\w|\s)*?(?=\n(?:Skills|Education|Projects|$))", re.IGNORECASE | re.DOTALL)


    def __init__(self, resume):
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
        self.parse_resume(resume)

    def parse_resume(self, text):
        # Extract contact information and professional summary
        info = self.extract_contact_info(text)
        self.name = info.get("name")
        self.email = info.get("email")
        self.phone = info.get("phone")
        self.professional_summary = self.extract_professional_summary(text)

        # Extract education entries
        for m in re.finditer(ParsedResume.education_regex, text):
            edu_text = m.group(1).strip()
            edu_entry = self.parse_education_entry(edu_text)
            if edu_entry:
                self.education.append(edu_entry)

        # Extract experience entries
        for m in re.finditer(ParsedResume.experience_regex, text):
            exp_text = m.group(1).strip()
            exp_entry = self.parse_experience_entry(exp_text)
            if exp_entry:
                self.experience_section.append(exp_entry)

        # Extract certifications
        for m in re.finditer(ParsedResume.certifications_regex, text):
            cert_text = m.group(1).strip()
            if cert_text:
                self.certifications.append(cert_text)

        # Extract project entries
        for m in re.finditer(ParsedResume.projects_regex, text):
            proj_text = m.group(1).strip()
            proj_entry = self.parse_project_entry(proj_text)
            if proj_entry:
                self.projects.append(proj_entry)

        # Extract volunteer experience entries
        for m in re.finditer(ParsedResume.volunteer_regex, text):
            vol_text = m.group(1).strip()
            vol_entry = self.parse_volunteer_entry(vol_text)
            if vol_entry:
                self.volunteer_experience.append(vol_entry)

        # Extract skills if present
        if "Technical Skills" in text and "Soft Skills" in text:
            skills = self.parse_skill_set(text)
            if skills:
                self.skills = skills

    def match_resume_text(self, regex: Pattern[str], text):
        m = regex.search(text)
        return m.group(1).strip() if m else None

    def parse_education_entry(self, text):
        m = re.search(r"(?P<degree>.+?),\s*(?P<school>.+?) \| (?P<start>\d{4})\s*[-–]\s*(?P<end>\d{4})", text)
        if m:
            return EducationEntry(
                degree=m.group("degree").strip(),
                school=m.group("school").strip(),
                start_date=m.group("start"),
                end_date=m.group("end"),
                details=[]
            )
        return None

    def extract_contact_info(self, text):
        name_match = re.search(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", text)
        email_match = re.search(r"[\w\.-]+@[\w\.-]+", text)
        phone_match = re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
        url_match = re.findall(r"https?://(?:www\.)?[\w./-]+", text)

        return {
            "name": name_match.group(1).strip() if name_match else None,
            "email": email_match.group(0).strip() if email_match else None,
            "phone": phone_match.group(0).strip() if phone_match else None,
            "urls": url_match
        }

    def extract_professional_summary(self, text):
        summary_match = re.search(r"Summary:\n(.*?)(?:\n\n|$)", text, re.DOTALL | re.IGNORECASE)
        return summary_match.group(1).strip() if summary_match else None

    def parse_experience_entry(self, text):
        m = re.search(r"(?P<title>.+?)\n(?P<company>.+?) \| (?P<start>\w+\s+\d{4})\s*[-–]\s*(?P<end>\w+\s+\d{4}|Present)", text)
        if m:
            bullets = re.findall(r"• (.+)", text)
            return ExperienceEntry(
                company=m.group("company").strip(),
                position=m.group("title").strip(),
                start_date=m.group("start").strip(),
                end_date=m.group("end").strip(),
                bullet_points=bullets
            )
        return None

    def parse_project_entry(self, text):
        m = re.search(r"(?P<title>.+?)\n(?:• .+\n?)+", text)
        if m:
            bullets = re.findall(r"• (.+)", text)
            return ProjectEntry(
                title=m.group("title").strip(),
                description="",
                bullet_points=bullets
            )
        return None

    def parse_volunteer_entry(self, text):
        m = re.search(r"(?P<role>.+?)\n(?P<organization>.+?) \| (?P<start>\w+\s+\d{4})\s*[-–]\s*(?P<end>\w+\s+\d{4}|Present)", text)
        if m:
            bullets = re.findall(r"• (.+)", text)
            return VolunteerExperienceEntry(
                organization=m.group("organization").strip(),
                role=m.group("role").strip(),
                start_date=m.group("start").strip(),
                end_date=m.group("end").strip(),
                bullet_points=bullets
            )
        return None

    def parse_skill_set(self, text):
        m = re.search(r"Skills:\n((?:.+\n)+?)\n\n", text, re.DOTALL | re.IGNORECASE)
        if m:
            all_skills = [s.strip() for s in m.group(1).split('\n') if s.strip()]
            return SkillSet(technical=all_skills, soft_skills=[])
        return None

    def serialize(self):
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
        return {"candidate": data}