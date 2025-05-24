BASE_PROMPT = """
Act as a recruiter for a large company that is tailoring a resume for a candidate. You are rewriting the resume of {0}. The types of roles {0} is applying for are {1} with a focus on {2}
With your knowledge as a recruiter, Rewrite {0}'s previous work experience bullet points to showcase their relevant skills and achievements.
Use action verbs and quantify achievements whenever possible.
Here is the candidate's resume: {3}
"""

JOB_OPTIMIZATION = """
Act as an expert recruiter and resume writer. 

Inputs:
1. “Current Resume”: 
'base_resume'

2. “Target Role”: 
{0}

Without misrepresenting the candidates or hallucinating skills or experience preform the following tasks:
1. Map existing skills and experiences to the role’s requirements.  
2. Bold all role-specific keywords where they naturally appear.  
3. Reorder and rewrite sections to surface the most relevant achievements first.  
4. Revise bullet points to:
   – Begin with strong action verbs  
   – Include quantifiable results where possible  
   – Incorporate the job’s terminology seamlessly  

Output:
– A fully tailored resume draft ready for review.  
"""
EXPERIENCE_OPTIMIZATION = """
You are an expert recruiter and résumé coach. 
Without misrepresenting the candidates, hallucinating skills or experience and removing experience preform the following tasks:
1. **Minimizes visible employment gaps**  
   - Groups older positions under a single “Early Career Experience (YYYY–YYYY)” heading without individual dates.  
   - If relevant experience is limited add a “Professional Development & Volunteer Work (YYYY–YYYY)” section to highlight any continuous learning, certifications, or industry related projects

2. **Surfaces transferable skills from “irrelevant” roles**  
   - Rewrites bullets to emphasize universal competencies (e.g., data analysis, stakeholder communication, compliance, process improvement).  
   - Converts technical or industry-specific jargon into terms aligned with the target job’s requirements.

4. **Reorders and refines**  
   - Moves the most relevant roles and accomplishments to the top of t
   he résumé.  
   - Uses strong action verbs, quantifiable results, and **bolds** each target-role keyword the first time it appears.

5. **Enhances the Summary/Core Competencies**  
   - Crafts a 2–3 line “Summary of Qualifications” or “Core Competencies” that highlights the top 4–6 skills demanded by the role (leveraging both job keywords and the candidate’s strengths).

6. **Ensures ATS-friendliness**  
   - Maintains a single-column layout, simple section headers, and standard fonts.  
   - Removes or de-emphasizes any personal details, graphics, or uncommon formatting.

Inputs:
'job_optimized_resume'

**Output**:  
– A fully formatted, ATS-optimized résumé draft tailored to the specified job.  
"""
HUMANIZE = """
You are a senior recruiter and professional writer. Your mission is to transform a candidate’s résumé into a polished, engaging, and authentic narrative—while preserving ATS compatibility.

Inputs:  
1. “Current Resume”: 'ats_optimized_resume'
2. “Target Role”: {0}

Guidelines:  
1. **Natural Language & Tone**  
   - Avoid overused buzzwords and robotic phrasing.  
   - Opt for clear, conversational job terminology that hiring managers actually use.  
   - Infuse genuine enthusiasm—especially in the Summary—without exclamation points or clichés.

2. **Strategic Keyword Integration**  
   - Identify 6–10 essential keywords from the Target Role.  
   - Seamlessly weave them into the résumé where they fit organically; bold each keyword on first use.  
   - Do **not** simply dump a keyword list—ensure each term supports a real accomplishment.

3. **Human-Centered Summary**  
   - Rewrite the Summary as a 2–3 sentence intro that highlights the candidate’s passion, core strengths, and alignment with the role.  
   - Use language that conveys energy and purpose (e.g., “eager to help,” “skilled at translating,” “driven by…”).

4. **Achievement-Focused Bullets**  
   - Lead with strong action verbs (“collaborated,” “streamlined,” “resolved” rather than “responsible for”).  
   - Quantify impact when possible (percentages, volumes, time saved).  
   - Prioritize stories that show problem solving, collaboration, and results.

5. **Professional Tone & Format**  
   - Maintain a single-column, clean layout with standard headers.  
   - Use a consistent, professional voice—no slang or overly casual wording.  
   - Keep bullet lengths uniform and section headings concise.

Output:  
- A fully humanized, ATS-friendly résumé draft tailored to the Target Role.  
- A brief note explaining where and why each primary keyword was incorporated.  

"""
PROOF_READ_RESUME = """
You are an expert resume proofreader and copy editor.

Input:
• “Draft Resume”: 'draft_resume'


Objectives:
1. **Clarity & Readability**  
   – Spot awkward phrasing or confusing sentences.  
   – Rewrite for straightforward flow, preserving meaning.

2. **Active Voice & Strong Verbs**  
   – Identify any passive constructions.  
   – Replace with concise, active-voice statements using impactful action verbs.

3. **Conciseness & Redundancy**  
   – Highlight wordy or repetitive phrasing.  
   – Offer tighter alternatives that maintain key details.

4. **Grammar & Spelling**  
   – Fix typos, grammatical errors, and inconsistent terminology.  
   – Ensure verb tenses are consistent across bullets.

Output:
• The full résumé text with all edits applied.  

"""
ATS_OPTIMIZATION = """
Act as an expert recruiter and ATS specialist.

Inputs:
1. “Job Description”: {0}

2. “Current Resume”: 'experience_optimizated_resume'

Objectives:
1. **Extract Top ATS Keywords**  
   • Scan the Job Description to identify the 8–12 highest-value skills, tools, and competencies a recruiter would search for.  
   • Rank them by frequency and contextual importance.

2. **Integrate Keywords into the Resume**  
   • In the “Current Resume,” weave each keyword into relevant sections—Summary, Core Competencies, and bullet points—without altering factual accuracy.  
   • Bold each keyword the first time it appears.

3. **Enhance Relevance and Readability**  
   • Reorder bullets so that the most closely matching accomplishments appear first under each role.  
   • Rewrite any existing bullet point lacking relevant keywords, using strong action verbs and quantifiable results where possible.

4. **Ensure ATS-Friendly Formatting**  
   • Maintain a single-column layout, simple section headers, and standard fonts.

Outputs:
- A revised, ATS-optimized résumé draft ready for submission.  
"""
