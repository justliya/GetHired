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
    # Simplified regex patterns for clean, standardized format
    summary_regex = re.compile(r"Summary:\s*\n(.*?)(?:\n(?:Skills:|Experience:|Education:|Projects:|$))", re.IGNORECASE | re.DOTALL)
    experience_regex = re.compile(r"Experience:\s*\n(.*?)(?:\n(?:---END EXPERIENCE---|Skills:|Education:|Projects:|Certifications:|$))", re.IGNORECASE | re.DOTALL)
    volunteer_regex = re.compile(r"Volunteer Experience:\s*\n(.*?)(?:\n(?:---END VOLUNTEER EXPERIENCE---|Projects:|Skills:|Education:|$))", re.IGNORECASE | re.DOTALL)
    projects_regex = re.compile(r"Projects:\s*\n(.*?)(?:\n(?:---END PROJECTS---|Skills:|Education:|Certifications:|$))", re.IGNORECASE | re.DOTALL)
    education_regex = re.compile(r"Education:\s*\n(.*?)(?:\n(?:---END EDUCATION---|Skills:|Certifications:|Projects:|$))", re.IGNORECASE | re.DOTALL)
    certifications_regex = re.compile(r"Certifications:\s*\n(.*?)(?:\n(?:---END CERTIFICATIONS---|Skills:|Education:|Projects:|$))", re.IGNORECASE | re.DOTALL)


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

        # Extract experience entries - handle multiple entries within the experience section
        for m in re.finditer(ParsedResume.experience_regex, text):
            exp_section_text = m.group(1).strip()
            # Parse individual experience entries from the experience section
            individual_experiences = self.parse_experience_section(exp_section_text)
            self.experience_section.extend(individual_experiences)

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
        skills = self.parse_skill_set(text)
        if skills:
            self.skills = skills

    def match_resume_text(self, regex: Pattern[str], text):
        m = regex.search(text)
        return m.group(1).strip() if m else None

    def parse_education_entry(self, text):
        """Parse education from clean, standardized format"""
        # Simple pattern for: Degree, School | Year - Year or Year
        patterns = [
            r"(?P<degree>.+?),\s*(?P<school>.+?)\s*\|\s*(?P<dates>[\d\s\-–]+)",
            r"(?P<school>.+?)\s*\|\s*(?P<degree>.+?)\s*\|\s*(?P<dates>[\d\s\-–]+)",
            r"(?P<degree>.+?),\s*(?P<school>.+)",  # Simple format without dates
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groupdict()
                degree = groups.get("degree", "").strip()
                school = groups.get("school", "").strip()
                dates = groups.get("dates", "").strip()
                
                start_date, end_date = "", ""
                if dates:
                    # Split on dash
                    date_parts = re.split(r'\s*[-–]\s*', dates, 1)
                    start_date = date_parts[0].strip()
                    end_date = date_parts[1].strip() if len(date_parts) > 1 else start_date
                
                if degree and school:
                    return EducationEntry(
                        degree=degree,
                        school=school,
                        start_date=start_date,
                        end_date=end_date,
                        details=[]
                    )
        
        return None

    def extract_contact_info(self, text):
        """Extract contact information from clean, standardized resume format"""
        # Simple patterns for the clean format produced by the prompt
        name_patterns = [
            r"^Name:\s*(.+?)(?=\n)",  # Name: label format
            r"^([A-Z][a-z']+(?:\s+[A-Z][a-z']+)+)(?=\n)",  # Traditional FirstName LastName
        ]
        
        name = None
        for pattern in name_patterns:
            name_match = re.search(pattern, text, re.MULTILINE)
            if name_match and name_match.group(1).strip():
                name = name_match.group(1).strip()
                break
        
        # Email pattern for clean format
        email_patterns = [
            r"Email:\s*([\w\.-]+@[\w\.-]+\.\w+)",  # Email: label format
            r"[\w\.-]+@[\w\.-]+\.\w+",  # Standard email anywhere in text
        ]
        
        email = None
        for pattern in email_patterns:
            email_match = re.search(pattern, text)
            if email_match:
                email = email_match.group(1).strip() if email_match.groups() else email_match.group(0).strip()
                break
        
        # Phone pattern for clean format
        phone_patterns = [
            r"Phone:\s*([\d\-\.\(\)\s]+)",  # Phone: label format
            r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",  # US format anywhere
        ]
        
        phone = None
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                phone = phone_match.group(1).strip() if phone_match.groups() else phone_match.group(0).strip()
                break
        
        # Extract any URLs present
        url_match = re.findall(r"https?://(?:www\.)?[\w./-]+", text)

        return {
            "name": name,
            "email": email,
            "phone": phone,
            "urls": url_match
        }

    def extract_professional_summary(self, text):
        """Extract professional summary from clean, standardized format"""
        summary_patterns = [
            # Standard label format
            r"Summary:\s*\n(.*?)(?:\n(?:Skills:|Experience:|Education:|$))",
            # Alternative formats
            r"(?:Professional\s+)?(?:Summary|Summary of Qualifications|Objective)\s*[:\-]?\s*\n(.*?)(?:\n(?:Skills:|Experience:|Education:|$))",
        ]
        
        for pattern in summary_patterns:
            summary_match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if summary_match and summary_match.group(1).strip():
                summary = summary_match.group(1).strip()
                # Clean up the summary - remove extra whitespace
                summary = re.sub(r'\n+', ' ', summary)
                summary = re.sub(r'\s+', ' ', summary)
                return summary
        
        return None

    def parse_experience_entry(self, text):
        """Parse work experience from clean, standardized format"""
        # Simple patterns for the clean format produced by the prompt
        patterns = [
            # Standard format: Job Title\nCompany, Location | Start - End
            r"(?P<position>.+?)\n(?P<company>.+?)\s*\|\s*(?P<dates>[\w\s\d\-–Present]+)",
            # Alternative: Company | Job Title | Dates
            r"(?P<company>.+?)\s*\|\s*(?P<position>.+?)\s*\|\s*(?P<dates>[\d\s\-–Present]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                # Extract bullet points from the text
                bullet_points = []
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('• ') or line.startswith('- '):
                        bullet_text = line[2:].strip()
                        bullet_points.append(bullet_text)
                
                # Parse dates
                dates = match.group("dates").strip()
                start_date, end_date = "", ""
                if dates:
                    # Split on dash or –
                    date_parts = re.split(r'\s*[-–]\s*', dates, 1)
                    start_date = date_parts[0].strip()
                    end_date = date_parts[1].strip() if len(date_parts) > 1 else ""
                
                return ExperienceEntry(
                    company=match.group("company").strip(),
                    position=match.group("position").strip(),
                    start_date=start_date,
                    end_date=end_date,
                    bullet_points=bullet_points
                )
        
        return None
        
        return None

    def parse_project_entry(self, text):
        """Parse project entry from clean format"""
        # Look for project title followed by bullet points
        lines = text.strip().split('\n')
        if lines:
            title = lines[0].strip()
            bullets = []
            for line in lines[1:]:
                line = line.strip()
                if line.startswith('• ') or line.startswith('- '):
                    bullets.append(line[2:].strip())
            
            if title:
                return ProjectEntry(
                    title=title,
                    description="",
                    bullet_points=bullets
                )
        return None

    def parse_volunteer_entry(self, text):
        """Parse volunteer entry from clean format"""
        # Look for Role, Organization | Start - End pattern
        pattern = r"(?P<role>.+?),\s*(?P<organization>.+?)\s*\|\s*(?P<dates>[\w\s\d\-–Present]+)"
        match = re.search(pattern, text)
        if match:
            dates = match.group("dates").strip()
            start_date, end_date = "", ""
            if dates:
                date_parts = re.split(r'\s*[-–]\s*', dates, 1)
                start_date = date_parts[0].strip()
                end_date = date_parts[1].strip() if len(date_parts) > 1 else ""
            
            bullets = re.findall(r"• (.+)", text)
            return VolunteerExperienceEntry(
                organization=match.group("organization").strip(),
                role=match.group("role").strip(),
                start_date=start_date,
                end_date=end_date,
                bullet_points=bullets
            )
        return None

    def parse_skill_set(self, text):
        """Parse skills from clean, standardized format with optional categories"""
        # Pattern for the clean format
        skills_pattern = r"Skills:\s*\n(.*?)(?:\n(?:Experience:|Education:|Projects:|$))"
        
        technical_skills = []
        soft_skills = []
        all_skills = []
        
        match = re.search(skills_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            skills_text = match.group(1).strip()
            lines = skills_text.split('\n')
            
            current_category = None
            
            for line in lines:
                line = line.strip()
                
                # Check if this line is a category header
                if line.endswith(':') and not line.startswith('•'):
                    current_category = line.lower()
                    continue
                
                # Handle bullet points
                if line.startswith('• ') or line.startswith('- '):
                    skill_line = line[2:].strip()
                    if skill_line:
                        # Categorize based on current category
                        if current_category and 'technical' in current_category:
                            technical_skills.append(skill_line)
                        elif current_category and ('soft' in current_category or 'interpersonal' in current_category):
                            soft_skills.append(skill_line)
                        else:
                            # If no category or unrecognized category, add to general skills
                            all_skills.append(skill_line)
                
                elif line and not line.isupper() and not line.endswith(':'):
                    # Plain text line, might be comma-separated
                    if ',' in line:
                        skills = [s.strip() for s in line.split(',') if s.strip()]
                        if current_category and 'technical' in current_category:
                            technical_skills.extend(skills)
                        elif current_category and ('soft' in current_category or 'interpersonal' in current_category):
                            soft_skills.extend(skills)
                        else:
                            all_skills.extend(skills)
                    else:
                        if current_category and 'technical' in current_category:
                            technical_skills.append(line)
                        elif current_category and ('soft' in current_category or 'interpersonal' in current_category):
                            soft_skills.append(line)
                        else:
                            all_skills.append(line)
        
        # Return structured skills if we found any
        if technical_skills or soft_skills or all_skills:
            # If we have categorized skills, use them; otherwise use all_skills as technical
            if technical_skills or soft_skills:
                return SkillSet(technical=technical_skills, soft_skills=soft_skills)
            else:
                return SkillSet(technical=all_skills, soft_skills=[])
        
        return None

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
        
        # Prepare skills data - keep categorized structure for template
        skills_data = {}
        if self.skills:
            skills_data = {
                "technical": self.skills.technical,
                "soft_skills": self.skills.soft_skills
            }
        
        # Also create a flat list for backward compatibility
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
            "skills": skills_data,  # Use categorized structure
            "all_skills": unique_skills  # Flat list for backward compatibility
        }
        return {"candidate": data}

    def parse_experience_section(self, exp_section_text):
        """Parse multiple experience entries from the experience section"""
        experience_entries = []
        
        # Find lines that start with ** and contain job titles and dates
        # Use a simpler approach: find lines with **Job Title** followed by any date-like content
        job_lines = []
        lines = exp_section_text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            # Look for lines that start with ** and contain job titles
            if line.startswith('**') and '**' in line[2:]:
                # Extract job title and date info
                parts = line.split('**', 2)  # Split on first two ** occurrences
                if len(parts) >= 3:
                    job_title = parts[1].strip()
                    date_info = parts[2].strip()
                    job_lines.append((i, job_title, date_info))
        
        # Process each job entry
        for j, (line_idx, job_title, date_info) in enumerate(job_lines):
            # Find the start and end of this job entry
            start_line = line_idx
            
            # Find end line (start of next job or end of section)
            if j + 1 < len(job_lines):
                end_line = job_lines[j + 1][0]
            else:
                end_line = len(lines)
            
            # Extract all lines for this job entry
            job_entry_lines = lines[start_line:end_line]
            job_entry_text = '\n'.join(job_entry_lines)
            
            # Parse this individual entry
            exp_entry = self.parse_individual_experience_entry(job_entry_text, job_title, date_info)
            if exp_entry:
                experience_entries.append(exp_entry)
        
        return experience_entries

    def parse_individual_experience_entry(self, entry_text, job_title, date_info):
        """Parse a single experience entry given the title and date info"""
        # Convert word numbers in dates first
        word_to_digit = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
        }
        
        processed_date = date_info
        # Convert date word numbers to digits
        for word, digit in word_to_digit.items():
            processed_date = re.sub(f'/{word}\\.osf', digit, processed_date, flags=re.IGNORECASE)
        processed_date = re.sub(r'/\.osf', '', processed_date)  # Clean up
        
        # Fix date formatting issues (e.g., "023" -> "2023")
        processed_date = re.sub(r'\b0(\d{2})\b', r'20\1', processed_date)
        
        # Extract start and end dates
        start_date, end_date = "", ""
        if '–' in processed_date or '-' in processed_date:
            date_parts = re.split(r'\s*[-–]\s*', processed_date)
            if len(date_parts) >= 2:
                start_date = date_parts[0].strip()
                end_date = date_parts[1].strip()
        else:
            start_date = processed_date.strip()
        
        # Extract company information (usually on the line after job title)
        lines = entry_text.split('\n')
        company = ""
        
        # Look for company line (usually the second non-empty line)
        non_empty_lines = [line.strip() for line in lines if line.strip()]
        if len(non_empty_lines) >= 2:
            # Skip the title line, get the next line which should be company
            potential_company = non_empty_lines[1]
            # Check if it looks like a company line (not a bullet point)
            if not potential_company.startswith('*   ') and not potential_company.startswith('•'):
                company = potential_company
        
        # Extract bullet points
        bullet_points = []
        for line in lines:
            line = line.strip()
            if line.startswith('*   ') or line.startswith('• ') or line.startswith('- '):
                # Handle markdown list items with bold
                bullet_text = line[4:].strip() if line.startswith('*   ') else line[2:].strip()
                # Remove markdown bold from bullet points
                bullet_text = re.sub(r'\*\*(.*?)\*\*', r'\1', bullet_text)
                bullet_points.append(bullet_text)
        
        # Clean up job title and company
        clean_job_title = re.sub(r'\*\*(.*?)\*\*', r'\1', job_title)
        clean_company = re.sub(r'\*\*(.*?)\*\*', r'\1', company)
        
        return ExperienceEntry(
            company=clean_company,
            position=clean_job_title,
            start_date=start_date,
            end_date=end_date,
            bullet_points=bullet_points
        )
