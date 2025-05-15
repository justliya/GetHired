import React, { useState, useEffect } from "react";
import { User, type AppUser } from "../contexts/UserContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Profile() {
  const { user, setUser, loading } = User();
  const [form, setForm] = useState<AppUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) setForm(user);
  }, [user]);

  if (loading) {
    return <div className="p-6 text-center">Loading profile…</div>;
  }
  if (!form) {
    return <div className="p-6 text-center">Please sign in to view your profile.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => f && { ...f, [name]: name === "connections" || name === "applications" || name === "interviews"
      ? Number(value)
      : value } as AppUser);
  };

  const handleSave = async () => {
    if (!form) return;
    await setDoc(doc(db, "users", form.uid), form);
    setUser(form);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
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
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border-b pb-1 focus:outline-none"
                />
                <input
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  placeholder="Role"
                  className="w-full border-b pb-1 focus:outline-none"
                />
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Location"
                  className="w-full border-b pb-1 focus:outline-none"
                />
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full border-b pb-1 focus:outline-none"
                />
                <input
                  name="photoURL"
                  value={form.photoURL}
                  onChange={handleChange}
                  placeholder="Photo URL"
                  className="w-full border-b pb-1 focus:outline-none"
                />
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Connections", value: form.connections },
            { label: "Applications", value: form.applications },
            { label: "Interviews", value: form.interviews },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl shadow p-4 text-center"
            >
              <h3 className="text-lg font-medium text-gray-700">{stat.label}</h3>
              <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}