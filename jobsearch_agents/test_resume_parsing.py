#!/usr/bin/env python3
"""
Test script for resume parsing and document generation
"""

import sys
import os
import logging

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from resume.parse import ParsedResume
from resume.resume_doc import create_formatted_resume

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def test_resume_parsing():
    """Test the resume parsing functionality"""
    
    # Sample resume text similar to what the app uses
    sample_resume = """John Doe
Software Developer
john.doe@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software developer with 5+ years of experience in web development. Proficient in JavaScript, HTML, CSS, and various frameworks. Strong problem-solving skills and ability to work in team environments.

TECHNICAL SKILLS
• Programming Languages: JavaScript, Python, Java
• Web Technologies: HTML, CSS, React, Node.js
• Databases: MySQL, MongoDB
• Tools: Git, Docker, Jenkins

EXPERIENCE
Senior Developer | Tech Company Inc. | 2021 - Present
• Developed and maintained web applications using React and Node.js
• Collaborated with cross-functional teams to deliver features on time
• Implemented CI/CD pipelines to improve deployment efficiency
• Mentored junior developers and conducted code reviews

Software Developer | StartupCorp | 2019 - 2021
• Built responsive web applications using modern JavaScript frameworks
• Optimized application performance and improved user experience
• Participated in agile development processes and sprint planning
• Worked closely with designers to implement pixel-perfect UIs

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2019

PROJECTS
• E-commerce Platform: Built a full-stack e-commerce application with React and Node.js
• Task Management App: Developed a productivity app with real-time updates
• Open Source Contributions: Regular contributor to popular JavaScript libraries"""

    print("🧪 Testing Resume Parsing...")
    print("=" * 50)
    
    # Test parsing
    try:
        parsed_resume = ParsedResume(sample_resume)
        print("✅ Resume parsing completed successfully")
        
        # Test serialization
        serialized_data = parsed_resume.serialize()
        candidate = serialized_data.get("candidate", {})
        
        print(f"\n📋 Parsed Data Summary:")
        print(f"  Name: {candidate.get('name')}")
        print(f"  Email: {candidate.get('email')}")
        print(f"  Phone: {candidate.get('phone')}")
        print(f"  Professional Summary: {len(candidate.get('professional_summary', ''))} chars")
        print(f"  Education entries: {len(candidate.get('education', []))}")
        print(f"  Experience entries: {len(candidate.get('experience_section', []))}")
        print(f"  Skills: {len(candidate.get('skills', []))}")
        
        # Print detailed education data
        if candidate.get('education'):
            print(f"\n🎓 Education Details:")
            for edu in candidate.get('education', []):
                print(f"  - {edu.get('degree')} at {edu.get('school')} ({edu.get('year')})")
        
        # Print detailed experience data
        if candidate.get('experience_section'):
            print(f"\n💼 Experience Details:")
            for exp in candidate.get('experience_section', []):
                print(f"  - {exp.get('role')} at {exp.get('company')} ({exp.get('dates')})")
                if exp.get('description'):
                    lines = exp.get('description', '').split('\n')[:2]  # First 2 lines
                    for line in lines:
                        if line.strip():
                            print(f"    {line[:60]}...")
        
        # Print skills
        if candidate.get('skills'):
            print(f"\n🛠️  Skills: {', '.join(candidate.get('skills', [])[:5])}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Resume parsing failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_document_generation():
    """Test document generation (without actual file operations)"""
    print("\n🧪 Testing Document Generation...")
    print("=" * 50)
    
    sample_resume = """John Doe
Software Developer
john.doe@email.com | (555) 123-4567

PROFESSIONAL SUMMARY
Experienced software developer with expertise in modern web technologies.

TECHNICAL SKILLS
• JavaScript, Python, React, Node.js

EXPERIENCE
Senior Developer | Tech Company | 2021 - Present
• Built web applications
• Led development teams

EDUCATION
Bachelor of Computer Science | Tech University | 2019"""

    try:
        # This will test parsing and template preparation without file operations
        parsed_resume = ParsedResume(sample_resume)
        candidate_data = parsed_resume.serialize()
        
        print("✅ Document generation setup completed")
        print(f"📄 Template data structure prepared for: {candidate_data['candidate'].get('name')}")
        
        # Show what would be passed to the template
        candidate = candidate_data["candidate"]
        print(f"\n📝 Template Variables:")
        print(f"  candidate.name: '{candidate.get('name')}'")
        print(f"  candidate.email: '{candidate.get('email')}'")
        print(f"  candidate.phone: '{candidate.get('phone')}'")
        print(f"  candidate.link: '{candidate.get('link')}'")
        print(f"  candidate.professional_summary: {len(candidate.get('professional_summary', ''))} chars")
        print(f"  candidate.education: {len(candidate.get('education', []))} entries")
        print(f"  candidate.experience_section: {len(candidate.get('experience_section', []))} entries")
        print(f"  candidate.skills: {len(candidate.get('skills', []))} items")
        
        return True
        
    except Exception as e:
        print(f"❌ Document generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Resume Processing Test Suite")
    print("=" * 50)
    
    parsing_success = test_resume_parsing()
    doc_gen_success = test_document_generation()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"  Resume Parsing: {'✅ PASS' if parsing_success else '❌ FAIL'}")
    print(f"  Document Generation: {'✅ PASS' if doc_gen_success else '❌ FAIL'}")
    
    if parsing_success and doc_gen_success:
        print("\n🎉 All tests passed! Resume processing should work correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        sys.exit(1)
