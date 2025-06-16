import os
import uuid
import tempfile
import logging
from datetime import datetime
from pathlib import Path
from docxtpl import DocxTemplate
from .parse import ParsedResume

import firebase_admin
from firebase_admin import credentials, storage
from google.cloud import storage as gcs

try:
    import requests
except ImportError:
    requests = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

logger = logging.getLogger(__name__)


def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    try:
        firebase_admin.get_app()
        logger.debug("Firebase already initialized")
    except ValueError:
        # No app initialized yet
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
        storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            
            firebase_admin.initialize_app(cred, {
                'storageBucket': storage_bucket
            })
            logger.info("Firebase initialized with service account for bucket: %s", storage_bucket)
        else:
            firebase_admin.initialize_app()
            logger.info("Firebase initialized with default credentials")


def create_unique_filename(job_position_title: str, user_id: str) -> str:
    """Create a unique, secure, easily-lookupable resume file name"""
    safe_job_title = "".join(c for c in job_position_title if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_job_title = safe_job_title.replace(' ', '_')[:50]
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    
    filename = f"resume_{safe_job_title}_{timestamp}_{unique_id}.docx"
    logger.debug("Created filename: %s for user: %s", filename, user_id)
    
    return filename


def upload_to_firebase_storage(file_path: str, filename: str, user_id: str) -> str:
    """Upload file to Firebase Storage and return download URL"""
    try:
        initialize_firebase()
        bucket = storage.bucket()
        storage_path = f"resumes/{user_id}/{filename}"
        
        blob = bucket.blob(storage_path)
        blob.metadata = {
            'uploadedBy': user_id,
            'uploadTime': datetime.now().isoformat(),
            'fileType': 'tailored_resume',
            'originalName': filename
        }
        
        blob.upload_from_filename(file_path)
        blob.make_public()
        
        logger.info("Successfully uploaded resume to Firebase Storage: %s", storage_path)
        return blob.public_url
        
    except (OSError, IOError) as e:
        logger.error("IO error uploading to Firebase Storage: %s", e)
        return upload_to_gcs_direct(file_path, filename, user_id)
    except Exception as e:
        logger.error("Unexpected error uploading to Firebase Storage: %s", e)
        return upload_to_gcs_direct(file_path, filename, user_id)


def upload_to_gcs_direct(file_path: str, filename: str, user_id: str) -> str:
    """Direct Google Cloud Storage upload as fallback"""
    try:
        bucket_name = os.getenv('FIREBASE_STORAGE_BUCKET', 'gethired-prod')
        client = gcs.Client()
        bucket = client.bucket(bucket_name)
        storage_path = f"resumes/{user_id}/{filename}"
        
        blob = bucket.blob(storage_path)
        blob.metadata = {
            'uploadedBy': user_id,
            'uploadTime': datetime.now().isoformat(),
            'fileType': 'tailored_resume'
        }
        
        blob.upload_from_filename(file_path)
        blob.make_public()
        
        logger.info("Successfully uploaded resume to GCS: %s", storage_path)
        return blob.public_url
        
    except (OSError, IOError) as e:
        logger.error("IO error uploading to GCS: %s", e)
        return ""
    except Exception as e:
        logger.error("Unexpected error uploading to GCS: %s", e)
        return ""


def create_formatted_resume(text: str, job_position_title: str = "Position", user_id: str = "anonymous") -> dict:
    """Create a formatted resume document and upload to Firebase Storage"""
    temp_file_path = None
    
    try:
        logger.info("🚀 Starting resume creation for user %s, position: %s", user_id, job_position_title)
        logger.debug("📄 Input resume text length: %d characters", len(text))
        
        # Parse the resume text
        logger.info("🔍 Parsing resume text...")
        parsed_resume = ParsedResume(text)
        candidate_data = parsed_resume.serialize()
        
        logger.info("✅ Resume parsed successfully")
        logger.debug("👤 Candidate data structure: %s", candidate_data)
        
        # Log the candidate data for debugging template issues
        candidate = candidate_data.get("candidate", {})
        logger.info("📋 Parsed candidate info:")
        logger.info("  - Name: %s", candidate.get("name"))
        logger.info("  - Email: %s", candidate.get("email"))
        logger.info("  - Phone: %s", candidate.get("phone"))
        logger.info("  - Link: %s", candidate.get("link"))
        logger.info("  - Summary length: %d", len(candidate.get("professional_summary") or ""))
        logger.info("  - Education entries: %d", len(candidate.get("education", [])))
        logger.info("  - Experience entries: %d", len(candidate.get("experience_section", [])))
        logger.info("  - Projects: %d", len(candidate.get("projects", [])))
        logger.info("  - Certifications: %d", len(candidate.get("certifications", [])))
        logger.info("  - Skills count: %d", len(candidate.get("skills", [])))
        
        # Log detailed candidate data for debugging
        logger.debug("🔍 Detailed candidate info:")
        if candidate.get("education"):
            for i, edu in enumerate(candidate.get("education", [])):
                logger.debug("  Education %d: %s at %s (%s)", i+1, edu.get("degree"), edu.get("school"), edu.get("year"))
        
        if candidate.get("experience_section"):
            for i, exp in enumerate(candidate.get("experience_section", [])):
                logger.debug("  Experience %d: %s at %s (%s)", i+1, exp.get("role"), exp.get("company"), exp.get("dates"))
        
        if candidate.get("skills"):
            skills_data = candidate.get("skills", {})
            if hasattr(skills_data, 'technical'):
                # SkillSet object
                technical_count = len(skills_data.technical) if skills_data.technical else 0
                soft_count = len(skills_data.soft_skills) if skills_data.soft_skills else 0
                logger.debug("  Skills: %d technical, %d soft skills", technical_count, soft_count)
            elif isinstance(skills_data, dict):
                # Dictionary format
                technical_skills = skills_data.get("technical", [])
                soft_skills = skills_data.get("soft_skills", [])
                logger.debug("  Skills: %d technical, %d soft skills", len(technical_skills), len(soft_skills))
            elif isinstance(skills_data, list):
                # List format (legacy)
                logger.debug("  Skills: %d total skills", len(skills_data))
            else:
                logger.debug("  Skills: Unknown format - %s", type(skills_data))
        
        # Use templateResumeDocV2.docx from the template directory
        # Try multiple possible paths for different environments
        possible_paths = [
            # Docker container path
            Path(__file__).parent.parent / "template" / "templateResumeDocV2.docx",
            # Local development path
            Path(__file__).parent.parent.parent / "template" / "templateResumeDocV2.docx",
            # Absolute path in Docker
            Path("/app/template/templateResumeDocV2.docx")
        ]
        
        template_path = None
        for path in possible_paths:
            logger.debug("🔍 Checking template path: %s", path)
            if path.exists():
                template_path = path
                logger.info("✅ Found template at: %s", template_path)
                break
        
        if not template_path:
            raise FileNotFoundError(f"Template file not found. Tried paths: {[str(p) for p in possible_paths]}")
            
        logger.info("📄 Using template: %s", template_path)
        
        # Create the DocxTemplate and render with candidate data
        logger.info("🔧 Loading DocxTemplate...")
        doc = DocxTemplate(str(template_path))
        
        # Prepare the context for template rendering
        # The template expects variables to be available directly AND as 'candidate'
        template_context = candidate_data["candidate"].copy()
        
        # Add the candidate object itself for templates that expect {{ candidate.name }}
        template_context["candidate"] = candidate_data["candidate"]
        
        # Handle skills properly - extract from SkillSet structure
        candidate = candidate_data["candidate"]  # Define candidate for easier access
        skills_data = candidate.get("skills", {})
        if hasattr(skills_data, 'technical'):
            # SkillSet object
            technical_skills = skills_data.technical or []
            soft_skills = skills_data.soft_skills or []
        elif isinstance(skills_data, dict):
            # Dictionary format
            technical_skills = skills_data.get("technical", [])
            soft_skills = skills_data.get("soft_skills", [])
        elif isinstance(skills_data, list):
            # List format (all skills as technical)
            technical_skills = skills_data
            soft_skills = []
        else:
            technical_skills = []
            soft_skills = []
        
        # Add some additional helper variables that might be useful in the template
        template_context.update({
            "full_name": candidate.get("name", ""),
            "contact_email": candidate.get("email", ""),
            "contact_phone": candidate.get("phone", ""),
            "summary": candidate.get("professional_summary", ""),
            "work_experience": candidate.get("experience_section", []),
            "education_list": candidate.get("education", []),
            "project_list": candidate.get("projects", []),
            "certification_list": candidate.get("certifications", []),
            "technical_skills": technical_skills,
            "soft_skills": soft_skills,
            "volunteer_work": candidate.get("volunteer_experience", [])
        })
        
        logger.info("🎨 Rendering template with context...")
        logger.debug("📝 Template context keys: %s", list(template_context.keys()))
        
        try:
            doc.render(template_context)
            logger.info("✅ Template rendered successfully")
        except Exception as render_error:
            logger.error("❌ Template rendering failed: %s", render_error)
            logger.debug("🔍 Full template context: %s", template_context)
            raise
        
        filename = create_unique_filename(job_position_title, user_id)
        logger.info("📁 Generated filename: %s", filename)
        
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            temp_file_path = temp_file.name
            doc.save(temp_file_path)
            logger.info("💾 Document saved to temporary file: %s", temp_file_path)
        
        # Check if the file was created and has content
        if os.path.exists(temp_file_path):
            file_size = os.path.getsize(temp_file_path)
            logger.info("📊 Generated document size: %d bytes", file_size)
            if file_size < 1000:  # Very small file might indicate rendering issues
                logger.warning("⚠️  Generated document is very small (%d bytes), check template rendering", file_size)
        else:
            raise FileNotFoundError("Temporary document file was not created")
        
        logger.info("☁️  Uploading to Firebase Storage...")
        download_url = upload_to_firebase_storage(temp_file_path, filename, user_id)
        
        if not download_url:
            logger.warning("⚠️  Failed to upload to storage, returning local file info")
            download_url = f"local://{filename}"
        else:
            logger.info("✅ Upload successful: %s", download_url)
        
        logger.info("🎉 Resume created successfully for %s (user: %s)", job_position_title, user_id)
        
        # Return the data in the expected format for the agent response
        return {
            "resume_text": text,
            "document_url": download_url,
            "download_url": download_url,  # Also provide as download_url for compatibility
            "filename": filename,
            "status": "success",
            "message": f"Resume successfully created and uploaded for {job_position_title}"
        }
        
    except FileNotFoundError as e:
        error_message = f"Template file not found: {str(e)}"
        logger.error("❌ %s", error_message)
        
        return {
            "resume_text": text,
            "document_url": "",
            "download_url": "",
            "filename": "",
            "status": "error",
            "message": error_message
        }
    except Exception as e:
        error_message = f"Unexpected error creating formatted resume: {str(e)}"
        logger.error("❌ %s", error_message)
        logger.exception("Full error details:")
        
        return {
            "resume_text": text,
            "document_url": "",
            "download_url": "",
            "filename": "",
            "status": "error",
            "message": error_message
        }
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug("🧹 Cleaned up temporary file: %s", temp_file_path)
            except OSError as e:
                logger.warning("⚠️  Failed to delete temporary file %s: %s", temp_file_path, e)


def download_and_extract_resume_text(storage_url: str) -> str:
    """
    Download a resume file from Firebase Storage, extract text content, and clean up
    
    Args:
        storage_url: Firebase Storage URL or GCS public URL
        
    Returns:
        str: Extracted text content from the resume file
        
    Raises:
        ValueError: If file download fails or text extraction fails
        requests.RequestException: If network request fails
        FileNotFoundError: If temporary file operations fail
    """
    temp_file_path = None
    
    try:
        if requests is None:
            raise ImportError("requests package not installed. Install with: pip install requests")
            
        if DocxDocument is None:
            logger.warning("python-docx package not installed. DOCX file processing may not work.")
            
        if PyPDF2 is None:
            logger.warning("PyPDF2 package not installed. PDF file processing may not work.")
        
        # Download the file
        logger.info("Downloading resume from: %s", storage_url)
        response = requests.get(storage_url, timeout=30)
        response.raise_for_status()
        
        # Determine file type from URL or content type
        file_extension = None
        if storage_url.lower().endswith('.docx'):
            file_extension = '.docx'
        elif storage_url.lower().endswith('.pdf'):
            file_extension = '.pdf'
        elif storage_url.lower().endswith('.txt'):
            file_extension = '.txt'
        else:
            # Try to determine from content type
            content_type = response.headers.get('content-type', '').lower()
            if 'word' in content_type or 'officedocument' in content_type:
                file_extension = '.docx'
            elif 'pdf' in content_type:
                file_extension = '.pdf'
            elif 'text' in content_type:
                file_extension = '.txt'
            else:
                logger.warning("Unknown file type, defaulting to .docx")
                file_extension = '.docx'
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(response.content)
        
        logger.debug("Downloaded file to temporary location: %s", temp_file_path)
        
        # Extract text based on file type
        if file_extension == '.docx':
            if DocxDocument is None:
                raise ValueError("python-docx package not installed. Cannot process DOCX files.")
                
            doc = DocxDocument(temp_file_path)
            text_content = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_content.append(paragraph.text.strip())
            
            # Also extract text from tables if any
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            text_content.append(cell.text.strip())
            
            extracted_text = '\n'.join(text_content)
            
        elif file_extension == '.pdf':
            if PyPDF2 is None:
                raise ValueError("PyPDF2 package not installed. Cannot process PDF files.")
                
            with open(temp_file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text_content = []
                
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_content.append(page_text.strip())
                
                extracted_text = '\n'.join(text_content)
                
        elif file_extension == '.txt':
            with open(temp_file_path, 'r', encoding='utf-8') as txt_file:
                extracted_text = txt_file.read()
                
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
        
        if not extracted_text.strip():
            raise ValueError("No text content could be extracted from the file")
        
        logger.info("Successfully extracted %d characters from resume", len(extracted_text))
        return extracted_text.strip()
        
    except requests.RequestException as e:
        error_msg = f"Failed to download file from {storage_url}: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    except (FileNotFoundError, OSError, IOError) as e:
        error_msg = f"File operation error: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    except Exception as e:
        error_msg = f"Unexpected error extracting text from resume: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug("Cleaned up temporary download file: %s", temp_file_path)
            except OSError as e:
                logger.warning("Failed to delete temporary download file %s: %s", temp_file_path, e)



    """
    Load resume and job description content from files.
    
    Args:
        resume_path (str, optional): Path to the resume file
        job_desc_path (str, optional): Path to the job description file
    
    Returns:
        tuple: (resume_content, job_desc_content) or (None, None) if files don't exist
    """
    logger.info("load_resume_job_desc called with resume_path: %s, job_desc_path: %s", resume_path, job_desc_path)
    
    resume_content = None
    job_desc_content = None
    
    # Load resume content
    if resume_path:
        try:
            if os.path.exists(resume_path):
                with open(resume_path, 'r', encoding='utf-8') as file:
                    resume_content = file.read().strip()
                    logger.info("Successfully loaded resume from: %s", resume_path)
            else:
                logger.warning("Resume file not found: %s", resume_path)
        except (OSError, IOError, UnicodeDecodeError) as e:
            logger.error("Error reading resume file %s: %s", resume_path, str(e))
    
    # Load job description content
    if job_desc_path:
        try:
            if os.path.exists(job_desc_path):
                with open(job_desc_path, 'r', encoding='utf-8') as file:
                    job_desc_content = file.read().strip()
                    logger.info("Successfully loaded job description from: %s", job_desc_path)
            else:
                logger.warning("Job description file not found: %s", job_desc_path)
        except (OSError, IOError, UnicodeDecodeError) as e:
            logger.error("Error reading job description file %s: %s", job_desc_path, str(e))
    
    return resume_content, job_desc_content
