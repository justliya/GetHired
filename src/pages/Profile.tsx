import  { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Link as LinkIcon,
  Edit,
  Save,
  Trash2
} from 'lucide-react';
import {
  User,
  type ExperienceEntry,
  type EducationEntry,
  type LinkEntry
} from '../context/UserContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Editable subset of AppUser
interface ProfileData {
  name: string;
  title: string;
  location: string;
  bio: string;
  avatar: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  links: LinkEntry[];
}

export default function Profile() {
  const { user, setUser, loading } = User();
  const [profile, setProfile] = useState<ProfileData>({
    name: '', title: '', location: '', bio: '', avatar: '',
    skills: [], experience: [], education: [], links: []
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          name: data.name ?? '',
          title: data.title ?? '',
          location: data.location ?? '',
          bio: data.bio ?? '',
          avatar: data.avatar ?? '',
          skills: Array.isArray(data.skills) ? data.skills : [],
          experience: Array.isArray(data.experience) ? (data.experience as ExperienceEntry[]) : [],
          education: Array.isArray(data.education) ? (data.education as EducationEntry[]) : [],
          links: Array.isArray(data.links) ? (data.links as LinkEntry[]) : []
        });
      }
    })();
  }, [user]);

  if (loading) return <div className="p-6 text-center">Loading profile…</div>;
  if (!user) return <div className="p-6 text-center">Please sign in to view your profile.</div>;

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), { ...profile }, { merge: true });
      setUser({ ...user, ...profile });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    }
  };

  const onChange = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
        >
          {isEditing ? (
            <><Save className="w-5 h-5 mr-2" />Save Changes</>
          ) : (
            <><Edit className="w-5 h-5 mr-2" />Edit Profile</>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="relative">
              <img
                src={profile.avatar || '/placeholder-avatar.png'}
                alt={profile.name || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover"
              />
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200">
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <input type="text" value={profile.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Your name" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input type="text" value={profile.title} onChange={(e) => onChange('title', e.target.value)} placeholder="Your title" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input type="text" value={profile.location} onChange={(e) => onChange('location', e.target.value)} placeholder="Location" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name || <span className="italic text-gray-400">Name not set</span>}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.title || <span className="italic text-gray-400">Title not set</span>}</p>
                  <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 mr-1" />{profile.location || <span className="italic text-gray-400">Location not set</span>}</div>
                </>
              )}
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">About</h3>
            {isEditing ? (
              <textarea value={profile.bio} onChange={(e) => onChange('bio', e.target.value)} placeholder="About you" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-32" />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{profile.bio || <span className="italic text-gray-400">Bio not set</span>}</p>
            )}
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, idx) => (
              <div key={idx} className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {skill}
                {isEditing && <button onClick={() => onChange('skills', profile.skills.filter((_, j) => j !== idx))} className="ml-2 text-red-600"><Trash2 className="w-4 h-4"/></button>}
              </div>
            ))}
          </div>
          {isEditing && (
            <form onSubmit={e => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('newSkill') as HTMLInputElement).value.trim(); if (v) onChange('skills', [...profile.skills, v]); e.currentTarget.reset(); }} className="mt-4 flex items-center space-x-2">
              <input name="newSkill" type="text" placeholder="New skill" className="p-2 border border-gray-300 dark:border-gray-600 rounded-md flex-1"/>
              <button type="submit" className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md">Add</button>
            </form>
          )}
        </motion.div>

        {/* Experience */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Experience</h3>
          <div className="space-y-6">
            {profile.experience.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium">{exp.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400">{exp.company}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">{exp.startDate} - {exp.endDate || 'Present'}</p>
                  </div>
                  {isEditing && <button onClick={() => onChange('experience', profile.experience.filter((_, j) => j !== idx))} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{exp.description}</p>
              </div>
            ))}
          </div>
          {isEditing && (
            <form onSubmit={e => { e.preventDefault(); const f = e.currentTarget as HTMLFormElement; const company = (f.elements.namedItem('company') as HTMLInputElement).value; const title = (f.elements.namedItem('title') as HTMLInputElement).value; const startDate = (f.elements.namedItem('startDate') as HTMLInputElement).value; const endDate = (f.elements.namedItem('endDate') as HTMLInputElement).value || null; const description = (f.elements.namedItem('description') as HTMLTextAreaElement).value; onChange('experience', [...profile.experience, { company, title, startDate, endDate, description }]); f.reset(); }} className="mt-4 space-y-2">
              <input name="company" type="text" placeholder="Company" className="w-full p-2 border rounded" />
              <input name="title" type="text" placeholder="Job Title" className="w-full p-2 border rounded" />
              <div className="flex gap-2">
                <input name="startDate" type="month" placeholder="Start Date" className="flex-1 p-2 border rounded" />
                <input name="endDate" type="month" placeholder="End Date (leave empty if current)" className="flex-1 p-2 border rounded" />
              </div>
              <textarea name="description" placeholder="Description" className="w-full p-2 border rounded h-24" />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-200">Add Experience</button>
            </form>
          )}
        </motion.div>

        {/* Education */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Education</h3>
          <div className="space-y-6">
            {profile.education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <h4 className="text-gray-900 dark:text-white font-medium">{edu.school}</h4>
                  <p className="text-gray-600 dark:text-gray-400">{edu.degree} in {edu.field}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Graduated {edu.graduationYear}</p>
                </div>
                {isEditing && <button onClick={() => onChange('education', profile.education.filter((_, j) => j !== idx))} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}
              </div>
            ))}
          </div>
          {isEditing && (
            <form onSubmit={e => { e.preventDefault(); const f = e.currentTarget as HTMLFormElement; const school = (f.elements.namedItem('school') as HTMLInputElement).value; const degree = (f.elements.namedItem('degree') as HTMLInputElement).value; const field = (f.elements.namedItem('field') as HTMLInputElement).value; const graduationYear = parseInt((f.elements.namedItem('graduationYear') as HTMLInputElement).value); onChange('education', [...profile.education, { school, degree, field, graduationYear }]); f.reset(); }} className="mt-4 space-y-2">
              <input name="school" type="text" placeholder="School" className="w-full p-2 border rounded" />
              <input name="degree" type="text" placeholder="Degree" className="w-full p-2 border rounded" />
              <input name="field" type="text" placeholder="Field of Study" className="w-full p-2 border rounded" />
              <input name="graduationYear" type="number" placeholder="Graduation Year" className="w-full p-2 border rounded" />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-200">Add Education</button>
            </form>
          )}
        </motion.div>

        {/* Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Links</h3>
          <div className="space-y-3">
            {profile.links.map((link, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                  <LinkIcon className="w-4 h-4 mr-2" />{link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                </a>
                {isEditing && <button onClick={() => onChange('links', profile.links.filter((_, j) => j !== idx))} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}
              </div>
            ))}
          </div>
          {isEditing && (
            <form onSubmit={e => { e.preventDefault(); const f = e.currentTarget as HTMLFormElement; const type = (f.elements.namedItem('type') as HTMLInputElement).value; const url = (f.elements.namedItem('url') as HTMLInputElement).value; onChange('links', [...profile.links, { type, url }]); f.reset(); }} className="mt-4 flex items-center space-x-2">
              <input name="type" type="text" placeholder="Link type (e.g. GitHub)" className="p-2 border rounded flex-1" />
              <input name="url" type="text" placeholder="URL" className="p-2 border rounded flex-2" />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-200">Add Link</button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
