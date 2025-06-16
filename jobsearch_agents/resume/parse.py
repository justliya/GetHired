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
        """Parse education with better field extraction"""
        patterns = [
            r"(?P<degree>.+?)\s*\|\s*(?P<school>.+?)\s*\|\s*(?P<year>\d{4})",
            r"(?P<school>.+?)\s*—\s*(?P<degree>.+?)\s*\((?P<year>\d{4})\)",
            r"(?P<degree>.+?),\s*(?P<school>.+?)\s*\|\s*(?P<year>\d{4})",
            r"(?P<school>.+?),\s*(?P<degree>.+?)\s*,?\s*(?P<year>\d{4})",
            r"(?P<degree>.+?),\s*(?P<school>.+?) \| (?P<start>\d{4})\s*[-–]\s*(?P<end>\d{4})",
            r"Bachelor.*?(?P<degree>[A-Za-z\s]+)\s*(?P<school>[A-Za-z\s&,.-]+)\s*\|\s*(?P<year>\d{4})",
            r"(?P<school>[A-Za-z\s&,.-]+University[A-Za-z\s&,.-]*)\s*\|\s*(?P<year>\d{4})",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groupdict()
                
                # Handle different pattern formats
                if 'start' in groups and 'end' in groups:
                    return EducationEntry(
                        degree=groups.get("degree", "").strip(),
                        school=groups.get("school", "").strip(),
                        start_date=groups.get("start"),
                        end_date=groups.get("end"),
                        details=[]
                    )
                else:
                    year = groups.get("year", "")
                    return EducationEntry(
                        degree=groups.get("degree", "").strip(),
                        school=groups.get("school", "").strip(),
                        start_date=year,
                        end_date=year,
                        details=[]
                    )
        
        return None

    def extract_contact_info(self, text):
        """Extract contact information with better pattern matching"""
        # Try multiple name patterns
        name_patterns = [
            r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",  # Traditional FirstName LastName
            r"^(.+?)(?:\n|Email:|Phone:|Contact:)",  # Everything before contact details
            r"^(.+?)(?:\s+\w+@\w+)",  # Everything before email
        ]
        
        name = None
        for pattern in name_patterns:
            name_match = re.search(pattern, text, re.IGNORECASE)
            if name_match and name_match.group(1).strip():
                name = name_match.group(1).strip()
                break
        
        # Enhanced email pattern
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        
        # Enhanced phone patterns
        phone_patterns = [
            r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",  # US format
            r"\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",  # International
            r"Phone:\s*([\d\-\.\(\)\s]+)",  # After "Phone:" label
        ]
        
        phone = None
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                phone = phone_match.group(1).strip() if phone_match.groups() else phone_match.group(0).strip()
                break
        
        url_match = re.findall(r"https?://(?:www\.)?[\w./-]+", text)

        return {
            "name": name,
            "email": email_match.group(0).strip() if email_match else None,
            "phone": phone,
            "urls": url_match
        }

    def extract_professional_summary(self, text):
        """Extract professional summary with multiple pattern attempts"""
        summary_patterns = [
            r"(?:Professional\s+)?Summary\s*[:\-]?\s*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+|EXPERIENCE|SKILLS|EDUCATION)|$)",
            r"(?:Professional\s+)?Objective\s*[:\-]?\s*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+|EXPERIENCE|SKILLS|EDUCATION)|$)",
            r"PROFESSIONAL\s+SUMMARY\s*\n(.*?)(?:\n[A-Z][A-Z\s]+|$)",
            r"About\s*[:\-]?\s*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+|EXPERIENCE|SKILLS|EDUCATION)|$)",
        ]
        
        for pattern in summary_patterns:
            summary_match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if summary_match and summary_match.group(1).strip():
                summary = summary_match.group(1).strip()
                # Clean up the summary - remove extra whitespace and formatting
                summary = re.sub(r'\n+', ' ', summary)
                summary = re.sub(r'\s+', ' ', summary)
                return summary
        
        return None

    def parse_experience_entry(self, text):
        """Parse work experience with better field extraction"""
        # Try multiple patterns for experience entries
        patterns = [
            r"(?P<position>.+?)\s*\|\s*(?P<company>.+?)\s*\|\s*(?P<dates>[\d\s\-–Present]+)",
            r"(?P<position>.+?)\s*—\s*(?P<company>.+?)\s*\|\s*(?P<dates>[\d\s\-–Present]+)",
            r"(?P<position>.+?)\s*at\s*(?P<company>.+?)\s*\((?P<dates>[\d\s\-–Present]+)\)",
            r"(?P<company>.+?)\s*—\s*(?P<position>.+?)\s*\((?P<dates>[\d\s\-–Present]+)\)",
            r"(?P<title>.+?)\n(?P<company>.+?) \| (?P<start>\w+\s+\d{4})\s*[-–]\s*(?P<end>\w+\s+\d{4}|Present)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # Extract bullet points from the text
                bullet_points = []
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                        bullet_points.append(line[1:].strip())
                
                # Handle different match groups based on pattern
                if 'start' in match.groupdict() and 'end' in match.groupdict():
                    # Pattern with separate start/end dates
                    return ExperienceEntry(
                        company=match.group("company").strip(),
                        position=match.group("title").strip(),
                        start_date=match.group("start").strip(),
                        end_date=match.group("end").strip(),
                        bullet_points=bullet_points
                    )
                else:
                    # Pattern with combined dates
                    dates = match.group("dates").strip() if "dates" in match.groupdict() else ""
                    start_date, end_date = "", ""
                    if dates:
                        # Try to split dates
                        date_parts = re.split(r'\s*[-–]\s*', dates)
                        if len(date_parts) >= 2:
                            start_date = date_parts[0].strip()
                            end_date = date_parts[1].strip()
                        else:
                            start_date = dates
                    
                    return ExperienceEntry(
                        company=match.group("company").strip(),
                        position=match.group("position").strip(),
                        start_date=start_date,
                        end_date=end_date,
                        bullet_points=bullet_points
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
        """Parse skills with better extraction"""
        # Look for various skills section patterns
        skills_patterns = [
            r"(?:Technical\s+)?Skills\s*[:\-]?\s*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+|$))",
            r"TECHNICAL\s+SKILLS\s*\n(.*?)(?:\n[A-Z][A-Z\s]+|$)",
            r"Skills\s*[:\-]?\s*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+|$))",
            r"Skills:\n((?:.+\n)+?)\n\n",  # Original pattern
        ]
        
        all_skills = []
        
        for pattern in skills_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                skills_text = match.group(1).strip()
                # Extract skills from bullet points or comma-separated lists
                lines = skills_text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                        # Bullet point format
                        skill_line = line[1:].strip()
                        if ':' in skill_line:
                            # Format like "• Programming Languages: JavaScript, Python"
                            skills_part = skill_line.split(':', 1)[1].strip()
                            skills = [s.strip() for s in skills_part.split(',') if s.strip()]
                            all_skills.extend(skills)
                        else:
                            all_skills.append(skill_line)
                    elif line and not line.isupper():
                        # Plain text line, might be comma-separated
                        if ',' in line:
                            skills = [s.strip() for s in line.split(',') if s.strip()]
                            all_skills.extend(skills)
                        else:
                            all_skills.append(line)
                break
        
        return SkillSet(technical=all_skills, soft_skills=[]) if all_skills else None

    def serialize(self):
        """Serialize the parsed resume data to match the template structure"""
        # Get the first URL for the link field
        contact_info = self.extract_contact_info("")  # We already have the data, just need URLs
        link = contact_info.get("urls", [""])[0] if contact_info.get("urls") else ""
        
        # Format education entries for template
        education_formatted = []
        for e in self.education:
            # Use end_date as year, or start_date if end_date not available
            year = e.end_date or e.start_date or ""
            education_formatted.append({
                "degree": e.degree,
                "school": e.school,
                "year": year,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "details": e.details
            })
        
        # Format experience entries for template
        experience_formatted = []
        for ex in self.experience_section:
            # Format dates for display
            dates = ""
            if ex.start_date and ex.end_date:
                dates = f"{ex.start_date} - {ex.end_date}"
            elif ex.start_date:
                dates = f"{ex.start_date} - Present"
            
            # Create description from bullet points
            description = ""
            if ex.bullet_points:
                description = "\n".join([f"• {bullet}" for bullet in ex.bullet_points])
            
            experience_formatted.append({
                "role": ex.position,  # Template expects 'role' field
                "company": ex.company,
                "dates": dates,  # Template expects 'dates' field
                "description": description,  # Template expects 'description' field
                "position": ex.position,  # Keep original for compatibility
                "start_date": ex.start_date,
                "end_date": ex.end_date,
                "bullet_points": ex.bullet_points
            })
        
        # Format projects for template
        projects_formatted = []
        for p in self.projects:
            description = ""
            if p.bullet_points:
                description = "\n".join([f"• {bullet}" for bullet in p.bullet_points])
            elif p.description:
                description = p.description
                
            projects_formatted.append({
                "title": p.title,
                "dates": "",  # Template expects dates, but projects might not have them
                "description": description,  # Template expects description
                "bullet_points": p.bullet_points
            })
        
        # Format volunteer experience for template
        volunteer_formatted = []
        for v in self.volunteer_experience:
            dates = ""
            if v.start_date and v.end_date:
                dates = f"{v.start_date} - {v.end_date}"
            elif v.start_date:
                dates = f"{v.start_date} - Present"
                
            description = ""
            if v.bullet_points:
                description = "\n".join([f"• {bullet}" for bullet in v.bullet_points])
                
            volunteer_formatted.append({
                "role": v.role,  # Template expects 'role' field
                "organization": v.organization,
                "dates": dates,  # Template expects 'dates' field
                "description": description,  # Template expects 'description' field
                "start_date": v.start_date,
                "end_date": v.end_date,
                "bullet_points": v.bullet_points
            })
        
        # Flatten skills for template - template expects a simple list
        all_skills = []
        if self.skills:
            all_skills.extend(self.skills.technical)
            all_skills.extend(self.skills.soft_skills)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in all_skills:
            if skill not in seen:
                seen.add(skill)
                unique_skills.append(skill)
        
        data = {
            "name": self.name or "",
            "email": self.email or "",
            "phone": self.phone or "",
            "link": link,  # Template expects 'link' field
            "professional_summary": self.professional_summary or "",
            "education": education_formatted,
            "certifications": self.certifications,
            "experience_section": experience_formatted,
            "projects": projects_formatted,
            "volunteer_experience": volunteer_formatted,
            "skills": unique_skills  # Template expects flat list, not nested object
        }
        return {"candidate": data}
