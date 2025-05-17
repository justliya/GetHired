import React, { useState, useEffect } from "react";
import { User, type AppUser } from "../contexts/UserContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Profile() {
  const { user, setUser, loading } = User();
  const [form, setForm] = useState<AppUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [prefs, setPrefs] = useState({
    industry: "",
    role: "",
    location: "",
    jobType: "",
    salary: "",
    postingDate: "",
    other: "",
  });

  useEffect(() => {
    if (!user) return;
    const loadUserProfile = async () => {
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setForm({ ...user, ...data });
        if (data.resumeUrl) setResumeUrl(data.resumeUrl);
        if (data.preferences) setPrefs(data.preferences);
      } else {
        setForm(user);
      }
    };
    loadUserProfile();
  }, [user]);

  if (loading) {
    return <div className="p-6 text-center">Loading profile…</div>;
  }
  if (!form) {
    return <div className="p-6 text-center">Please sign in to view your profile.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) =>
      f
        ? ({
            ...f,
            [name]: ["connections", "applications", "interviews"].includes(name)
              ? Number(value)
              : value,
          } as AppUser)
        : null
    );
  };

  const handleSaveProfile = async () => {
    if (!form) return;
    try {
      await setDoc(doc(db, "users", form.uid), form, { merge: true });
      setUser(form);
      setIsEditing(false);
      console.log("Profile saved successfully");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile. Check console for details.");
    }
  };

  // Resume upload handlers
  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeFile(e.target.files?.[0] || null);
  };

  const handleUploadResume = async () => {
    try {
      if (!resumeFile || !form) return;
      const storage = getStorage();
      const fileRef = storageRef(storage, `resumes/${form.uid}/${resumeFile.name}`);
      await uploadBytes(fileRef, resumeFile);
      const publicUrl = await getDownloadURL(fileRef);
      await setDoc(
        doc(db, "users", form.uid),
        { resumeUrl: publicUrl },
        { merge: true }
      );
      setResumeUrl(publicUrl);
      alert("Resume uploaded to Firebase Storage");
    } catch (err) {
      console.error("Resume upload error:", err);
      alert("Failed to upload resume. Check console for details.");
    }
  };

  // Preferences handlers
  const handlePrefsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPrefs((p) => ({ ...p, [name]: value }));
  };

  const handleSavePrefs = async () => {
    if (!form) return;
    try {
      await setDoc(
        doc(db, "users", form.uid),
        { preferences: prefs },
        { merge: true }
      );
      console.log("Preferences saved:", prefs);
      alert("Preferences saved");
    } catch (err) {
      console.error("Error saving preferences:", err);
      alert("Failed to save preferences. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <button
            onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            {isEditing ? "Save Profile" : "Edit Profile"}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-6">
          <img
            src={form.photoURL}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
          />
          <div className="flex-1 space-y-1">
            {isEditing ? (
              <>
                <input name="name" value={form.name} onChange={handleChange} className="w-full border-b pb-1 focus:outline-none" />
                <input name="role" value={form.role} onChange={handleChange} placeholder="Role" className="w-full border-b pb-1 focus:outline-none" />
                <input name="location" value={form.location} onChange={handleChange} placeholder="Location" className="w-full border-b pb-1 focus:outline-none" />
                <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full border-b pb-1 focus:outline-none" />
                <input name="photoURL" value={form.photoURL} onChange={handleChange} placeholder="Photo URL" className="w-full border-b pb-1 focus:outline-none" />
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900">{form.name}</h2>
                <p className="text-gray-500">{form.role}</p>
                <p className="text-gray-500">{form.location}</p>
                <p className="text-gray-400 text-sm">{form.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Resume Upload */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Resume</h2>
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Uploaded Resume
            </a>
          )}
          {isEditing && (
            <div className="space-y-2">
              <input type="file" accept="application/pdf" onChange={handleResumeChange} className="block" />
              <button onClick={handleUploadResume} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
                Upload Resume
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Connections", value: form.connections },
            { label: "Applications", value: form.applications },
            { label: "Interviews", value: form.interviews },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow p-4 text-center">
              <h3 className="text-lg font-medium text-gray-700">{stat.label}</h3>
              <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Job Preferences */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Job Preferences</h2>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "industry", placeholder: "Industry" },
                { name: "role", placeholder: "Role" },
                { name: "location", placeholder: "Location" },
                { name: "jobType", placeholder: "Part time / Full time" },
                { name: "salary", placeholder: "Salary" },
                { name: "postingDate", placeholder: "Posting Date" },
                { name: "other", placeholder: "Other" },
              ].map((field) => (
                <input
                  key={field.name}
                  name={field.name}
                  value={prefs[field.name as keyof typeof prefs]}
                  placeholder={field.placeholder}
                  onChange={handlePrefsChange}
                  className="w-full border-b pb-1 focus:outline-none"
                />
              ))}
              <button onClick={handleSavePrefs} className="col-span-full px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                Save Preferences
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p><strong>Industry:</strong> {prefs.industry}</p>
              <p><strong>Role:</strong> {prefs.role}</p>
              <p><strong>Location:</strong> {prefs.location}</p>
              <p><strong>Job Type:</strong> {prefs.jobType}</p>
              <p><strong>Salary:</strong> {prefs.salary}</p>
              <p><strong>Posting Date:</strong> {prefs.postingDate}</p>
              <p><strong>Other:</strong> {prefs.other}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}