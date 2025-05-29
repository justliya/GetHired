from docxtpl import DocxTemplate

# Load the template
template_path = "docs\\templateResumeDoc.docx"
doc = DocxTemplate(template_path)

# Fill in your resume data
parsed_resume = {
    "candidate": {
        "name": "La’Kaleigh Harris",
        "email": "lakaleigh.harris@gmail.com",
        "phone": "734-406-4847",
        "link": "linkedin.com/in/la-kaleigh-harris",
        "professional_summary": "Experienced software engineer with a strong focus on developer productivity, CI/CD pipelines, and infrastructure as code. Passionate about building scalable systems and automating workflows.",
        "education": [
            {"school": "Schoolcraft College", "degree": "Computer Information Systems", "year": ""}
        ],
        "certifications": [],
        "projects": [
            {
                "title": "Skyline Analytics",
                "dates": "2023 – Present",
                "description": "Architected data pipelines and built ML models in Vertex AI for sports forecasting and analysis."
            },
            {
                "title": "MLH Fellowship",
                "dates": "Sept 2021 – Dec 2021",
                "description": "Supported 10,000+ developers via GitHub Actions workflows and mentored contributors on CI/CD best practices."
            }
        ],
        "volunteer_experience": [],
        "experience_section": [
            {
                "role": "Software Engineer III",
                "company": "Duo Security (Cisco)",
                "dates": "Oct 2022 – Present",
                "description": "Led GitHub Actions automation and built OpenSearch dashboards that reduced build times by 90%."
            },
            {
                "role": "Software Engineer II, Developer Productivity",
                "company": "Duo Security (Cisco)",
                "dates": "Feb 2022 – Oct 2022",
                "description": "Deployed infrastructure in Terraform, enabled CI/CD improvements, and authored security guidelines."
            }
        ],
        "skills": [
            "Python", "C#", "JavaScript/TypeScript", "SQL", "Bash",
            "AWS", "GCP", "Terraform", "Docker", "Kubernetes",
            "Git", "GitHub Actions", "GitLab CI",
            "Datadog", "OpenSearch Dashboards", "Prometheus",
            "Vertex AI", "BigQuery", "Pandas", "Regression Modeling", "Prompt Engineering", "Agenic AI"
        ]
    }
}

# Render and save
doc.render(parsed_resume)
doc.save("lakaleigh_filled_resume.docx")
print("✅ Resume generated: lakaleigh_filled_resume.docx")
