# firestore_service.py
import firebase_admin
from firebase_admin import credentials, firestore
from google.adk.tools.tool_context import ToolContext

class FirestoreService:
    def __init__(self, credentials_path=None):
        if not firebase_admin._apps:
            if credentials_path:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        self.db = firestore.client()

    def get_user_job_preferences(self, user_id: str,tool_context: ToolContext) -> dict | None:
        """Fetches job search preferences for a given user."""
        try:
            pref_ref = self.db.collection('users').document(user_id) \
                               .collection('preferences').document('jobSearch')
            doc = pref_ref.get()
            if doc.exists:
                return doc.to_dict()
            else:
                print(f"No job search preferences found for user {user_id}")
                return None
        except Exception as e:
            print(f"Error fetching preferences for user {user_id}: {e}")
            return None
