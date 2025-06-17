#!/usr/bin/env python3

"""Integration test for the complete resume parsing with categorized skills"""

import re
from dataclasses import dataclass
from typing import List
import json

# Define the data classes we need for testing
@dataclass
class SkillSet:
    technical: List[str]
    soft_skills: List[str]

def test_complete_workflow():
    """Test the complete workflow with clean format and categorized skills"""
    
    # Sample clean resume format (as produced by the updated prompt)
    clean_resume_text = """
Name: John Smith
Email: john.smith@email.com
Phone: 555-123-4567

Summary:
Experienced software engineer with 5+ years developing scalable web applications. Proven track record of leading teams and delivering high-quality solutions on time.

Skills:
Technical Skills:
• JavaScript
• Python
• React
• Node.js
• AWS
• Docker

Soft Skills:
• Leadership
• Communication
• Problem Solving
• Team Collaboration

Experience:
Senior Software Engineer
TechCorp Inc, San Francisco CA | January 2022 - Present
• Led development of customer portal serving 10,000+ users
• Implemented microservices architecture reducing load times by 40%
• Mentored team of 3 junior developers

Software Engineer
StartupCo, Palo Alto CA | June 2019 - December 2021
• Built RESTful APIs using Python and Flask
• Collaborated with design team on user interface improvements
• Implemented automated testing procedures

---END EXPERIENCE---

Education:
Bachelor of Science in Computer Science, Stanford University | 2015 - 2019

---END EDUCATION---
"""

    print("🧪 Testing complete workflow with clean format...")
    
    # Test skills parsing
    skills_pattern = r"Skills:\s*\n(.*?)(?:\n(?:Experience:|Education:|Projects:|$))"
    match = re.search(skills_pattern, clean_resume_text, re.DOTALL | re.IGNORECASE)
    
    if match:
        skills_text = match.group(1).strip()
        lines = skills_text.split('\n')
        
        technical_skills = []
        soft_skills = []
        current_category = None
        
        for line in lines:
            line = line.strip()
            
            # Check if this line is a category header
            if line.endswith(':') and not line.startswith('•'):
                current_category = line.lower()
                continue
            
            # Handle bullet points
            if line.startswith('• '):
                skill_line = line[2:].strip()
                if skill_line:
                    if current_category and 'technical' in current_category:
                        technical_skills.append(skill_line)
                    elif current_category and 'soft' in current_category:
                        soft_skills.append(skill_line)
        
        skills = SkillSet(technical=technical_skills, soft_skills=soft_skills)
        
        print(f"✅ Skills parsing successful!")
        print(f"   Technical Skills ({len(skills.technical)}): {skills.technical}")
        print(f"   Soft Skills ({len(skills.soft_skills)}): {skills.soft_skills}")
    else:
        print("❌ Skills parsing failed!")
        return
    
    # Test contact info extraction
    name_match = re.search(r"^Name:\s*(.+?)(?=\n)", clean_resume_text, re.MULTILINE)
    email_match = re.search(r"Email:\s*([\w\.-]+@[\w\.-]+\.\w+)", clean_resume_text)
    phone_match = re.search(r"Phone:\s*([\d\-\.\(\)\s]+)", clean_resume_text)
    
    contact_info = {
        "name": name_match.group(1).strip() if name_match else None,
        "email": email_match.group(1).strip() if email_match else None,
        "phone": phone_match.group(1).strip() if phone_match else None,
    }
    
    print(f"\n📋 Contact Info:")
    print(f"   Name: {contact_info['name']}")
    print(f"   Email: {contact_info['email']}")
    print(f"   Phone: {contact_info['phone']}")
    
    # Test experience parsing
    exp_pattern = r"Experience:\s*\n(.*?)(?:\n(?:---END EXPERIENCE---|Skills:|Education:|Projects:|$))"
    exp_match = re.search(exp_pattern, clean_resume_text, re.DOTALL | re.IGNORECASE)
    
    experiences = []
    if exp_match:
        exp_text = exp_match.group(1).strip()
        
        # Split by double newlines to separate entries
        entries = re.split(r'\n\s*\n', exp_text)
        
        for entry in entries:
            entry = entry.strip()
            if not entry:
                continue
                
            lines = entry.split('\n')
            if len(lines) >= 2:
                position = lines[0].strip()
                company_info = lines[1].strip()
                
                # Parse company and dates
                if ' | ' in company_info:
                    company_part, dates_part = company_info.split(' | ', 1)
                    company = company_part.strip()
                    dates = dates_part.strip()
                    
                    # Parse start and end dates
                    if ' - ' in dates:
                        start_date, end_date = dates.split(' - ', 1)
                        start_date = start_date.strip()
                        end_date = end_date.strip()
                    else:
                        start_date = dates
                        end_date = ""
                    
                    # Extract bullet points
                    bullets = []
                    for line in lines[2:]:
                        line = line.strip()
                        if line.startswith('• '):
                            bullets.append(line[2:].strip())
                    
                    experiences.append({
                        "position": position,
                        "company": company,
                        "start_date": start_date,
                        "end_date": end_date,
                        "bullets": bullets
                    })
    
    print(f"\n💼 Experience Entries ({len(experiences)}):")
    for i, exp in enumerate(experiences, 1):
        print(f"   {i}. {exp['position']} at {exp['company']}")
        print(f"      {exp['start_date']} - {exp['end_date']}")
        print(f"      Bullets: {len(exp['bullets'])}")
    
    # Test template structure creation
    template_data = {
        "candidate": {
            "name": contact_info["name"],
            "email": contact_info["email"],
            "phone": contact_info["phone"],
            "skills": {
                "technical": skills.technical,
                "soft_skills": skills.soft_skills
            },
            "experience_section": experiences
        }
    }
    
    print(f"\n🎯 Template Structure Created:")
    print(f"   Candidate Name: {template_data['candidate']['name']}")
    print(f"   Technical Skills: {len(template_data['candidate']['skills']['technical'])}")
    print(f"   Soft Skills: {len(template_data['candidate']['skills']['soft_skills'])}")
    print(f"   Experience Entries: {len(template_data['candidate']['experience_section'])}")
    
    # Test JSON serialization
    try:
        json_output = json.dumps(template_data, indent=2)
        print(f"\n✅ JSON Serialization successful! Length: {len(json_output)} characters")
        
        # Show a snippet of the JSON
        lines = json_output.split('\n')
        if len(lines) > 10:
            print("📄 JSON Preview (first 10 lines):")
            for line in lines[:10]:
                print(f"   {line}")
            print("   ...")
        
    except Exception as e:
        print(f"❌ JSON Serialization failed: {e}")
    
    print(f"\n🎉 Complete workflow test successful!")
    return template_data

if __name__ == "__main__":
    test_complete_workflow()
