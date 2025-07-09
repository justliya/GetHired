import os
import uuid
import tempfile
import logging
from datetime import datetime, timedelta
from pathlib import Path
from docxtpl import DocxTemplate
from .parse import ParsedResume
from typing import Optional
import firebase_admin
from firebase_admin import credentials, storage

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
        SERVICE_ACCOUNT_KEY_PATH = os.getenv('SERVICE_ACCOUNT_KEY_PATH')
        storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
        
        if SERVICE_ACCOUNT_KEY_PATH and os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
            firebase_admin.initialize_app(cred, {
                'storageBucket': storage_bucket
            })
            logger.info("Firebase initialized with service account for bucket: %s", storage_bucket)
        else:
            # Initialize with default credentials
            firebase_admin.initialize_app(options={
                'storageBucket': storage_bucket
            })
            logger.info("Firebase initialized with default credentials for bucket: %s", storage_bucket)


def create_unique_filename(job_position_title: str, user_id: str) -> str:
    """Create a unique, secure, easily-lookupable resume file name"""
    safe_job_title = "".join(c for c in job_position_title if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_job_title = safe_job_title.replace(' ', '_')[:50]
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    
    filename = f"resume_{safe_job_title}_{timestamp}_{unique_id}.docx"
    logger.debug("Created filename: %s for user: %s", filename, user_id)
    
    return filename


def upload_to_firebase_storage(file_path: str, filename: str, user_id: str) -> dict:
    """Upload file to Firebase Storage and return download URL"""
    try:
        logger.info("🚀 Starting Firebase Storage upload process")
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
        
        # Initialize Firebase if not already done
        initialize_firebase()
        
        # Get bucket
        bucket = storage.bucket()
        logger.info("  🪣 Using Firebase Storage bucket: %s", bucket.name)
        
        # Create storage path similar to JavaScript example
        storage_path = f"resumes/{user_id}/{filename}"
        logger.info("  🗂️  Storage path: %s", storage_path)
        
        # Create blob
        blob = bucket.blob(storage_path)
        
        # Set metadata
        blob.metadata = {
            'uploadedBy': user_id,
            'uploadTime': datetime.now().isoformat(),
            'fileType': 'tailored_resume',
            'originalSize': str(file_size),
            'contentType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
        
        # Upload file
        logger.info("  ⬆️  Starting file upload...")
        blob.upload_from_filename(file_path, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        logger.info("  ✅ File upload completed successfully")
        
        # Make the blob publicly accessible
        logger.info("  🌐 Setting blob to public access...")
        blob.make_public()
        
        # Get the public download URL (similar to getDownloadURL in JavaScript)
        download_url = blob.public_url
        
        # Generate a signed URL for authenticated access (24 hours validity)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=24),
            method="GET"
        )
        
        # Firebase Storage URL format
        firebase_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/{storage_path.replace('/', '%2F')}?alt=media"
        
        logger.info("✅ Successfully uploaded resume to Firebase Storage")
        logger.info("  📥 Download URL: %s", download_url)
        logger.info("  🔗 Firebase URL: %s", firebase_url)
        logger.info("  🔐 Signed URL: %s", signed_url)
        
        return {
            "success": True,
            "download_url": download_url,  # Primary download URL
            "public_url": download_url,
            "firebase_url": firebase_url,
            "signed_url": signed_url,
            "storage_path": storage_path,
            "bucket": bucket.name
        }
        
    except Exception as e:
        logger.error("❌ Error during Firebase Storage upload:")
        logger.error("  🚨 Error type: %s", type(e).__name__)
        logger.error("  🚨 Error details: %s", e)
        logger.exception("  📋 Full stack trace:")
        
        return {
            "success": False,
            "error": f"Upload error: {str(e)}",
            "download_url": "",
            "public_url": "",
            "firebase_url": "",
            "signed_url": ""
        }


def extract_user_id_from_url(resume_url: str) -> str:
    """Extract user_id from Firebase Storage URL"""
    try:
        import re
        
        # Pattern to match user_id in Firebase Storage URLs
        # Example: /resumes/user123/filename.pdf
        pattern = r'/resumes/([^/]+)/'
        
        match = re.search(pattern, resume_url)
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
        
        # Use templateResumeDocV2.docx from the template directory
        possible_paths = [
            Path(__file__).parent.parent / "template" / "templateResumeDocV2.docx",
            Path(__file__).parent.parent.parent / "template" / "templateResumeDocV2.docx",
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
        template_context["candidate"] = candidate_data["candidate"]
        
               # Handle skills properly
        skills_data = candidate.get("skills", {})
        if hasattr(skills_data, 'technical'):
            technical_skills = skills_data.technical or []
            soft_skills = skills_data.soft_skills or []
        elif isinstance(skills_data, dict):
            technical_skills = skills_data.get("technical", [])
            soft_skills = skills_data.get("soft_skills", [])
        elif isinstance(skills_data, list):
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
        all_skills_list = []
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
            
            if file_size < 1000:
                logger.warning("⚠️  Generated document is very small (%d bytes), check template rendering", file_size)
            elif file_size > 1024 * 1024:
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
        
        # Upload to Firebase Storage
        logger.info("☁️  Uploading to Firebase Storage...")
        logger.info("🔧 Environment check:")
        logger.info("  FIREBASE_STORAGE_BUCKET: %s", os.getenv('FIREBASE_STORAGE_BUCKET', 'NOT_SET'))
        logger.info("  FIREBASE_SERVICE_ACCOUNT_KEY_PATH: %s", os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH', 'NOT_SET'))
        
        upload_result = upload_to_firebase_storage(temp_file_path, filename, user_id)
        
        if not upload_result.get("success", False):
            logger.warning("⚠️  Failed to upload to storage, returning local file info")
            return {
                "resume_text": text,
                "document_url": f"local://{filename}",
                "download_url": f"local://{filename}",
                "public_url": f"local://{filename}",
                "firebase_url": f"local://{filename}",
                "filename": filename,
                "status": "partial_success",
                "message": f"Resume created but upload failed for {job_position_title}",
                "upload_error": upload_result.get("error", "Unknown upload error")
            }
        else:
            logger.info("✅ Upload successful: %s", upload_result.get("download_url"))
        
        logger.info("🎉 Resume created successfully for %s (user: %s)", job_position_title, user_id)
        
        return {
            "resume_text": text,
            "document_url": upload_result.get("download_url", ""),
            "download_url": upload_result.get("download_url", ""),
            "public_url": upload_result.get("public_url", ""),
            "firebase_url": upload_result.get("firebase_url", ""),
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
        storage_url: Firebase Storage URL
        
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

def test_firebase_connectivity(bucket_name: Optional[str] = None) -> dict:
    """Test Firebase Storage connectivity and bucket access"""
    try:
        if not bucket_name:
            bucket_name = os.getenv('FIREBASE_STORAGE_BUCKET')
        
        logger.info("🧪 Testing Firebase Storage connectivity...")
        logger.info("  🪣 Target bucket: %s", bucket_name)
        
        # Initialize Firebase
        initialize_firebase()
        
        # Get bucket
        bucket = storage.bucket()
        logger.info("  🪣 Got bucket: %s", bucket.name)
        
        # Test bucket access by creating a test file
        test_blob_name = f"test_connectivity_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        test_blob = bucket.blob(test_blob_name)
        test_content = f"Test connectivity at {datetime.now().isoformat()}"
        
        logger.info("  ✍️  Testing write access with test file: %s", test_blob_name)
        test_blob.upload_from_string(test_content, content_type='text/plain')
        
        # Verify the test file was uploaded
        logger.info("  🔍 Verifying test file upload...")
        if test_blob.exists():
            logger.info("  ✅ Write test successful - file exists")
            
            # Test public access
            try:
                test_blob.make_public()
                public_url = test_blob.public_url
                logger.info("  🌐 Public URL: %s", public_url)
                public_access = True
            except Exception as e:
                logger.warning("  ⚠️  Could not make blob public: %s", e)
                public_access = False
            
            # Clean up test file
            test_blob.delete()
            logger.info("  🧹 Test file cleaned up")
            
            return {
                "success": True,
                "message": "Firebase Storage connectivity test passed",
                "bucket_name": bucket.name,
                "public_access": public_access
            }
        else:
            return {
                "success": False,
                "error": "Test file was not created successfully",
                "bucket_name": bucket.name
            }
            
    except Exception as e:
        logger.error("❌ Firebase Storage connectivity test failed: %s", e)
        logger.exception("Full error details:")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }