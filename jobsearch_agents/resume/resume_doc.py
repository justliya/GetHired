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

logger = logging.getLogger(__name__)


def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    try:
        # Check if any apps are already initialized
        firebase_admin.get_app()
        logger.debug("Firebase already initialized")
    except ValueError:
        # No app initialized yet
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
        
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET', 'gethired-prod')
            
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
        candidate = ParsedResume(text).serialize()
        
        # Use templateResumeDocV2.docx from the template directory
        template_path = Path(__file__).parent.parent.parent / "template" / "templateResumeDocV2.docx"
        
        if not template_path.exists():
            raise FileNotFoundError(f"Template file not found at: {template_path}")
            
        logger.info("Using template: %s", template_path)
        
        doc = DocxTemplate(str(template_path))
        doc.render(candidate)
        
        filename = create_unique_filename(job_position_title, user_id)
        
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            temp_file_path = temp_file.name
            doc.save(temp_file_path)
        
        download_url = upload_to_firebase_storage(temp_file_path, filename, user_id)
        
        if not download_url:
            logger.warning("Failed to upload to storage, returning local file info")
            download_url = f"local://{filename}"
        
        logger.info("Resume created successfully for %s (user: %s)", job_position_title, user_id)
        
        return {
            "resume_text": text,
            "download_url": download_url,
            "filename": filename,
            "status": "success",
            "message": f"Resume formatted and uploaded successfully for {job_position_title}"
        }
        
    except FileNotFoundError as e:
        error_message = f"Template file not found: {str(e)}"
        logger.error(error_message)
        
        return {
            "resume_text": text,
            "download_url": "",
            "filename": "",
            "status": "error",
            "message": error_message
        }
    except (OSError, IOError) as e:
        error_message = f"File operation error: {str(e)}"
        logger.error(error_message)
        
        return {
            "resume_text": text,
            "download_url": "",
            "filename": "",
            "status": "error",
            "message": error_message
        }
    except Exception as e:
        error_message = f"Unexpected error creating formatted resume: {str(e)}"
        logger.error(error_message)
        
        return {
            "resume_text": text,
            "download_url": "",
            "filename": "",
            "status": "error",
            "message": error_message
        }
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug("Cleaned up temporary file: %s", temp_file_path)
            except OSError as e:
                logger.warning("Failed to delete temporary file %s: %s", temp_file_path, e)
