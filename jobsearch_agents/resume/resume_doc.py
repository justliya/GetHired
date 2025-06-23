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

def upload_to_gcs_direct(file_path: str, filename: str, user_id: str) -> dict:
    """Direct Google Cloud Storage upload with multiple URL formats"""
    try:
        # Log detailed upload start information
        logger.info("🚀 Starting GCS upload process")
        logger.info("  📁 File path: %s", file_path)
        logger.info("  📄 Filename: %s", filename)
        logger.info("  👤 User ID: %s", user_id)
        
        # Validate file exists and has content
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file does not exist: {file_path}")
        
        file_size = os.path.getsize(file_path)
        logger.info("  📊 File size: %d bytes", file_size)
        
        if file_size == 0:
            raise ValueError(f"Source file is empty: {file_path}")
        
        # Get bucket configuration
        bucket_name = os.getenv('GCS_RESUME_BUCKET', 'gethired-resumes')
        logger.info("  🪣 Target bucket: %s", bucket_name)
        
        # Initialize GCS client
        logger.info("  🔗 Initializing GCS client...")
        try:
            client = gcs.Client()
            logger.info("  ✅ GCS client initialized successfully")
            
            # Get project info to verify authentication
            project_id = client.project
            logger.info("  🆔 GCS project ID: %s", project_id)
        except Exception as client_error:
            logger.error("  ❌ Failed to initialize GCS client: %s", client_error)
            raise
        
        # Get bucket
        logger.info("  🪣 Getting bucket: %s", bucket_name)
        try:
            bucket = client.bucket(bucket_name)
            # Test bucket access by checking if it exists
            if bucket.exists():
                logger.info("  ✅ Bucket exists and is accessible")
            else:
                logger.error("  ❌ Bucket does not exist: %s", bucket_name)
                raise RuntimeError(f"Bucket does not exist: {bucket_name}")
        except Exception as bucket_error:
            logger.error("  ❌ Failed to access bucket: %s", bucket_error)
            raise
        
        # Create storage path
        storage_path = f"resumes/{user_id}/{filename}"
        logger.info("  🗂️  Storage path: %s", storage_path)
        
        # Create blob with metadata
        logger.info("  📦 Creating blob with metadata...")
        blob = bucket.blob(storage_path)
        blob.metadata = {
            'uploadedBy': user_id,
            'uploadTime': datetime.now().isoformat(),
            'fileType': 'tailored_resume',
            'originalSize': str(file_size)
        }
        
        # Perform the upload
        logger.info("  ⬆️  Starting file upload...")
        blob.upload_from_filename(file_path)
        logger.info("  ✅ File upload completed successfully")
        
        # Verify the upload by checking if blob exists and getting its size
        logger.info("  🔍 Verifying upload...")
        blob.reload()  # Refresh blob properties from GCS
        uploaded_size = blob.size
        logger.info("  📊 Uploaded file size: %d bytes", uploaded_size)
        
        if uploaded_size != file_size:
            logger.warning("  ⚠️  Size mismatch! Original: %d bytes, Uploaded: %d bytes", file_size, uploaded_size)
        else:
            logger.info("  ✅ Size verification passed")
        
        # Check if blob exists
        if not blob.exists():
            raise RuntimeError(f"Upload verification failed - blob does not exist: {storage_path}")
        
        logger.info("  ✅ Upload verification completed successfully")
        
        # Try to make public (works with legacy ACL), but handle uniform bucket-level access gracefully
        try:
            blob.make_public()
            logger.debug("Successfully made blob public using ACL")
            # Test if public URL actually works by checking if we get a valid response
            public_url = blob.public_url
            if public_url.startswith('http://'):
                public_url = public_url.replace('http://', 'https://')
            use_public_urls = True
        except Exception as e:
            logger.warning("Cannot use make_public() due to uniform bucket-level access: %s", e)
            public_url = None
            use_public_urls = False
        
        # Generate signed URL for authenticated access (valid for 24 hours)  
        from datetime import timedelta
        signed_url = blob.generate_signed_url(expiration=timedelta(hours=24), method='GET')
        
        # Generate cloud console compatible authenticated URL
        # Format: https://storage.cloud.google.com/bucket/path?authuser=X
        cloud_console_url = f"https://storage.cloud.google.com/{bucket_name}/{storage_path}?authuser=3"
        
        # For authenticated access, prefer the cloud console format, but keep signed URL as backup
        authenticated_url = cloud_console_url
        
        # Always use signed URL as the primary public_url since public access may not work
        # This ensures downloads work even with uniform bucket-level access
        public_url = signed_url
        
        # Generate additional URL formats for compatibility
        direct_url = f"https://storage.googleapis.com/{bucket_name}/{storage_path}"
        firebase_compatible_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{storage_path.replace('/', '%2F')}?alt=media"
        
        logger.info("Successfully uploaded resume to GCS: %s", storage_path)
        logger.info("Primary Public URL (signed): %s", public_url)
        logger.info("Direct URL: %s", direct_url)
        logger.info("Firebase compatible URL: %s", firebase_compatible_url)
        logger.info("Authenticated URL (cloud console): %s", cloud_console_url)
        logger.info("Signed URL (backup): %s", signed_url)
        
        return {
            "success": True,
            "public_url": public_url,
            "firebase_url": firebase_compatible_url,
            "gcs_url": direct_url,
            "authenticated_url": authenticated_url,  # Use cloud console format
            "signed_url": signed_url,  # Keep signed URL for fallback
            "storage_path": storage_path,
            "bucket": bucket_name
        }
        
    except (OSError, IOError) as e:
        logger.error("❌ IO error during GCS upload:")
        logger.error("  📁 File path: %s", file_path)
        logger.error("  📄 Filename: %s", filename)
        logger.error("  👤 User ID: %s", user_id)
        logger.error("  🚨 Error details: %s", e)
        logger.error("  📂 File exists: %s", os.path.exists(file_path) if file_path else "N/A")
        if file_path and os.path.exists(file_path):
            logger.error("  📊 File size: %d bytes", os.path.getsize(file_path))
        return {
            "success": False,
            "error": f"IO error: {str(e)}",
            "public_url": "",
            "firebase_url": "",
            "gcs_url": "",
            "authenticated_url": ""
        }
    except Exception as e:
        logger.error("❌ Unexpected error during GCS upload:")
        logger.error("  📁 File path: %s", file_path)
        logger.error("  📄 Filename: %s", filename)
        logger.error("  👤 User ID: %s", user_id)
        logger.error("  🚨 Error type: %s", type(e).__name__)
        logger.error("  🚨 Error details: %s", e)
        logger.exception("  📋 Full stack trace:")
        return {
            "success": False,
            "error": f"Upload error: {str(e)}",
            "public_url": "",
            "firebase_url": "",
            "gcs_url": "",
            "authenticated_url": ""
        }

from typing import Optional

def extract_user_id_from_url(resume_url: str) -> str:
    """Extract user_id from Firebase Storage or GCS URL"""
    try:
        import re
        
        # Pattern to match user_id in Firebase Storage URLs
        # Example: /resumes/user123/filename.pdf
        firebase_pattern = r'/resumes/([^/]+)/'
        
        # Pattern to match user_id in direct GCS URLs  
        # Example: https://storage.googleapis.com/bucket/resumes/user123/filename.pdf
        gcs_pattern = r'/resumes/([^/]+)/'
        
        # Try Firebase pattern first
        match = re.search(firebase_pattern, resume_url)
        if match:
            user_id = match.group(1)
            logger.debug("Extracted user_id from URL: %s", user_id)
            return user_id
            
        # Try GCS pattern
        match = re.search(gcs_pattern, resume_url)
        if match:
            user_id = match.group(1)
            logger.debug("Extracted user_id from URL: %s", user_id)
            return user_id
            
        logger.warning("Could not extract user_id from URL: %s", resume_url)
        return ""
        
    except Exception as e:
        logger.warning("Error extracting user_id from URL %s: %s", resume_url, e)
        return ""

def create_formatted_resume(text: str, job_position_title: str = "Position", user_id: Optional[str] = None, resume_url: Optional[str] = None) -> dict:
    """Create a formatted resume document and upload to Firebase Storage"""
    temp_file_path = None
    
    try:
        logger.info("🚀 Starting resume creation for user %s, position: %s", user_id, job_position_title)
        logger.info("📄 Input resume text length: %d characters", len(text))
        logger.debug("📋 First 500 chars of resume text: %s", text[:500])
        
        # Validate inputs
        if not text or text.strip() == "":
            error_msg = "Resume text is empty or None"
            logger.error("❌ %s", error_msg)
            return {
                "resume_text": text,
                "document_url": "",
                "download_url": "",
                "filename": "",
                "status": "error",
                "message": error_msg
            }
        
        # Validate and extract user_id with fallback logic
        if not user_id or user_id.strip() == "":
            if resume_url:
                logger.info("🔍 Attempting to extract user_id from resume URL")
                extracted_user_id = extract_user_id_from_url(resume_url)
                if extracted_user_id:
                    user_id = extracted_user_id
                    logger.info("✅ Successfully extracted user_id from URL: %s", user_id)
                else:
                    user_id = "anonymous"
                    logger.warning("⚠️ Could not extract user_id from URL, using 'anonymous'")
            else:
                user_id = "anonymous"
                logger.warning("⚠️ No user_id or resume_url provided, using 'anonymous'")
        
        # Parse the resume text
        logger.info("🔍 Parsing resume text...")
        try:
            parsed_resume = ParsedResume(text)
            candidate_data = parsed_resume.serialize()
            logger.info("✅ Resume parsed successfully")
        except Exception as parse_error:
            logger.error("❌ Failed to parse resume: %s", parse_error)
            return {
                "resume_text": text,
                "document_url": "",
                "download_url": "",
                "filename": "",
                "status": "error",
                "message": f"Failed to parse resume: {str(parse_error)}"
            }
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
        
        template_context = candidate_data["candidate"].copy()
        # Add the candidate object itself for templates that expect {{ candidate.name }}
        template_context["candidate"] = candidate_data["candidate"]
        
        # Handle skills properly - extract from SkillSet structure
        candidate = candidate_data["candidate"]  # Define candidate for easier access
        skills_data = candidate.get("skills", {})
        if hasattr(skills_data, 'technical'):
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
        
        # Create a flat skills list for template compatibility
        all_skills_list: list[str] = []
        all_skills_list.extend(technical_skills)
        all_skills_list.extend(soft_skills)
        
        # Update candidate.skills to include both structured and flat formats
        template_context["candidate"]["skills_flat"] = all_skills_list
        template_context["candidate"]["technical_skills"] = technical_skills
        template_context["candidate"]["soft_skills"] = soft_skills
        
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
        
        # Create temporary file and save document
        logger.info("💾 Creating temporary file for document...")
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            temp_file_path = temp_file.name
            logger.info("📂 Temporary file path: %s", temp_file_path)
            
            # Save the document
            logger.info("💾 Saving document to temporary file...")
            doc.save(temp_file_path)
            logger.info("✅ Document saved successfully")
        
        # Verify the file was created and has content
        logger.info("🔍 Verifying temporary document file...")
        if os.path.exists(temp_file_path):
            file_size = os.path.getsize(temp_file_path)
            logger.info("📊 Generated document size: %d bytes", file_size)
            
            if file_size < 1000:  # Very small file might indicate rendering issues
                logger.warning("⚠️  Generated document is very small (%d bytes), check template rendering", file_size)
            elif file_size > 1024 * 1024:  # File larger than 1MB
                logger.info("📈 Large document generated (%d bytes), this is good", file_size)
            else:
                logger.info("✅ Document size looks reasonable (%d bytes)", file_size)
                
            # Try to read a few bytes to ensure file is valid
            try:
                with open(temp_file_path, 'rb') as test_file:
                    first_bytes = test_file.read(4)
                    if first_bytes == b'PK\x03\x04':  # ZIP/DOCX file signature
                        logger.info("✅ File has valid DOCX/ZIP signature")
                    else:
                        logger.warning("⚠️  File does not have valid DOCX signature: %s", first_bytes.hex())
            except Exception as read_error:
                logger.warning("⚠️  Could not verify file signature: %s", read_error)
        else:
            raise FileNotFoundError(f"Temporary document file was not created: {temp_file_path}")
        
        logger.info("☁️  Uploading to Google Cloud Storage...")
        logger.info("🔧 Environment check:")
        logger.info("  GCS_RESUME_BUCKET: %s", os.getenv('GCS_RESUME_BUCKET', 'NOT_SET'))
        logger.info("  GOOGLE_APPLICATION_CREDENTIALS: %s", os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'NOT_SET'))
        
        # Test GCS connectivity before attempting upload
        connectivity_test = test_gcs_connectivity()
        if not connectivity_test.get("success", False):
            logger.error("❌ GCS connectivity test failed: %s", connectivity_test.get("error"))
            return {
                "resume_text": text,
                "document_url": f"local://{filename}",
                "download_url": f"local://{filename}",
                "public_url": f"local://{filename}",
                "firebase_url": f"local://{filename}",
                "gcs_url": f"local://{filename}",
                "authenticated_url": f"local://{filename}",
                "filename": filename,
                "status": "error",
                "message": f"GCS connectivity failed: {connectivity_test.get('error')}",
                "upload_error": connectivity_test.get("error")
            }
        else:
            logger.info("✅ GCS connectivity test passed")
        
        upload_result = upload_to_gcs_direct(temp_file_path, filename, user_id)
        
        if not upload_result.get("success", False):
            logger.warning("⚠️  Failed to upload to storage, returning local file info")
            return {
                "resume_text": text,
                "document_url": f"local://{filename}",
                "download_url": f"local://{filename}",
                "public_url": f"local://{filename}",
                "firebase_url": f"local://{filename}",
                "gcs_url": f"local://{filename}",
                "authenticated_url": f"local://{filename}",
                "filename": filename,
                "status": "partial_success",
                "message": f"Resume created but upload failed for {job_position_title}",
                "upload_error": upload_result.get("error", "Unknown upload error")
            }
        else:
            logger.info("✅ Upload successful: %s", upload_result.get("public_url"))
        
        logger.info("🎉 Resume created successfully for %s (user: %s)", job_position_title, user_id)
        
        return {
            "resume_text": text,
            "document_url": upload_result.get("public_url", ""),
            "download_url": upload_result.get("firebase_url", ""),
            "public_url": upload_result.get("public_url", ""),
            "firebase_url": upload_result.get("firebase_url", ""),
            "gcs_url": upload_result.get("gcs_url", ""),
            "authenticated_url": upload_result.get("authenticated_url", ""),
            "filename": filename,
            "storage_path": upload_result.get("storage_path", ""),
            "bucket": upload_result.get("bucket", ""),
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

from typing import Optional

def test_gcs_connectivity(bucket_name: Optional[str] = None) -> dict:
    """Test Google Cloud Storage connectivity and bucket access"""
    try:
        if not bucket_name:
            bucket_name = os.getenv('GCS_RESUME_BUCKET', 'gethired-resumes')
        
        logger.info("🧪 Testing GCS connectivity...")
        logger.info("  🪣 Target bucket: %s", bucket_name)
        
        # Initialize client
        client = gcs.Client()
        project_id = client.project
        logger.info("  🆔 Project ID: %s", project_id)
        
        # Test bucket access
        bucket = client.bucket(bucket_name)
        
        # Check if bucket exists
        if not bucket.exists():
            return {
                "success": False,
                "error": f"Bucket {bucket_name} does not exist",
                "project_id": project_id
            }
        
        # Try to list some objects (limited to 5)
        blobs = list(bucket.list_blobs(max_results=5))
        logger.info("  📁 Found %d objects in bucket", len(blobs))
        
        # Test write permission with a small test file
        test_blob_name = f"test_connectivity_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        test_blob = bucket.blob(test_blob_name)
        test_content = f"Test connectivity at {datetime.now().isoformat()}"
        
        logger.info("  ✍️  Testing write access with test file: %s", test_blob_name)
        test_blob.upload_from_string(test_content, content_type='text/plain')
        
        # Verify the test file was uploaded
        if test_blob.exists():
            logger.info("  ✅ Write test successful")
            # Clean up test file
            test_blob.delete()
            logger.info("  🧹 Test file cleaned up")
            
            return {
                "success": True,
                "message": "GCS connectivity test passed",
                "project_id": project_id,
                "bucket_name": bucket_name,
                "objects_count": len(blobs)
            }
        else:
            return {
                "success": False,
                "error": "Test file was not created successfully",
                "project_id": project_id
            }
            
    except Exception as e:
        logger.error("❌ GCS connectivity test failed: %s", e)
        logger.exception("Full error details:")
        return {
            "success": False,
            "error": str(e),
            "project_id": getattr(client, 'project', 'unknown') if 'client' in locals() else 'unknown'
        }
