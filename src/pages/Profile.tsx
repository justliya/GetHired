import { useState } from "react";

export default function Profile() {
  const [profile] = useState({
    name: "Ally",
    email: "aaliyah@example.com",
    role: "Software Engineer",
    location: "Chicago, IL",
    avatar: "https://i.pravatar.cc/150?img=47",
    connections: 12,
    applications: 34,
    interviews: 5,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            Edit Profile
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-6">
          <img
            src={profile.avatar}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
            <p className="text-gray-500">{profile.role}</p>
            <p className="text-gray-500">{profile.location}</p>
            <p className="text-gray-400 text-sm">{profile.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <h3 className="text-lg font-medium text-gray-700">Connections</h3>
            <p className="text-2xl font-bold text-blue-600">{profile.connections}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <h3 className="text-lg font-medium text-gray-700">Applications</h3>
            <p className="text-2xl font-bold text-blue-600">{profile.applications}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <h3 className="text-lg font-medium text-gray-700">Interviews</h3>
            <p className="text-2xl font-bold text-blue-600">{profile.interviews}</p>
          </div>
        </div>
      </div>
    </div>
  );
}