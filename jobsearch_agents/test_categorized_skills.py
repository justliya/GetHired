#!/usr/bin/env python3

"""Test script for categorized skills parsing"""

import sys
import os
import re
from dataclasses import dataclass
from typing import List

# Define the data classes we need for testing
@dataclass
class SkillSet:
    technical: List[str]
    soft_skills: List[str]

@dataclass
class ExperienceEntry:
    company: str
    position: str
    start_date: str
    end_date: str
    bullet_points: List[str]

@dataclass
class EducationEntry:
    degree: str
    school: str
    start_date: str
    end_date: str
    details: List[str]

# Simple version of the skills parsing method
def parse_skill_set(text):
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

# Sample resume with categorized skills
sample_resume_text = """
Name: La'Kaleigh Harris
Email: lakaleigh.harris@gmail.com
Phone: 734-406-4847

Summary:
Experienced software engineer with expertise in full-stack development and data analysis. Proven track record of delivering scalable solutions and leading cross-functional teams.

Skills:
Technical Skills:
• JavaScript
• Python
• React
• Node.js
• SQL
• AWS

Soft Skills:
• Leadership
• Communication
• Problem Solving
• Team Collaboration

Experience:
Software Engineer II
TechCorp, Detroit MI | January 2022 - Present
• Developed and maintained web applications using React and Node.js
• Led a team of 5 developers on critical projects
• Improved application performance by 40%

Junior Software Engineer
StartupCo, Ann Arbor MI | June 2020 - December 2021
• Built RESTful APIs using Python and Flask
• Collaborated with design team on user interface improvements
• Implemented automated testing procedures

---END EXPERIENCE---

Education:
Bachelor of Science in Computer Science, University of Michigan | 2016 - 2020

---END EDUCATION---
"""

def test_categorized_skills():
    print("🧪 Testing categorized skills parsing...")
    
    # Parse the skills from the sample text
    skills = parse_skill_set(sample_resume_text)
    
    # Test skills extraction
    if skills:
        print(f"\n🛠️ Technical Skills ({len(skills.technical)}):")
        for skill in skills.technical:
            print(f"  • {skill}")
        
        print(f"\n🤝 Soft Skills ({len(skills.soft_skills)}):")
        for skill in skills.soft_skills:
            print(f"  • {skill}")
        
        print(f"\n✅ Skills parsing successful!")
        print(f"   Technical: {skills.technical}")
        print(f"   Soft: {skills.soft_skills}")
    else:
        print("❌ No skills found!")
    
    # Test with uncategorized skills
    uncategorized_text = """
Skills:
• JavaScript
• Python
• Leadership
• Communication

Experience:
Software Engineer
"""
    
    print(f"\n🧪 Testing uncategorized skills...")
    uncategorized_skills = parse_skill_set(uncategorized_text)
    if uncategorized_skills:
        print(f"   All skills as technical: {uncategorized_skills.technical}")
        print(f"   Soft skills: {uncategorized_skills.soft_skills}")
    else:
        print("❌ Uncategorized skills test failed!")

if __name__ == "__main__":
    test_categorized_skills()
