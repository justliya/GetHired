import firebase_admin
from firebase_admin import credentials, firestore


cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)


db = firestore.client()

def get_user_by_uid(uid: str) -> dict | None:
    """
    Fetches a user document from the 'users' collection by UID.
    Returns the document data as a dict, or None if not found.
    """
    doc_ref = db.collection("users").document(uid)
    snapshot = doc_ref.get()
    if snapshot.exists:
        return snapshot.to_dict()
    else:
        return None

def list_all_users() -> list[dict]:
    """
    Streams all user documents in the 'users' collection.
    Returns a list of dicts containing user data.
    """
    users = []
    for doc in db.collection("users").stream():
        data = doc.to_dict()
        data["uid"] = doc.id
        users.append(data)
    return users


if __name__ == "__main__":
    
    user = get_user_by_uid()
    if user:
        print("User data:", user)
    else:
        print("No user found with that UID.")

    
    all_users = list_all_users()
    print(f"Total users in Firestore: {len(all_users)}")
    for u in all_users:
        print(u)