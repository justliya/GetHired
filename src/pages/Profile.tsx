import { useState } from 'react';
import { motion } from 'framer-motion';
import {
   MapPin,
  Link as LinkIcon, Edit, Save, Plus, Trash2
} from 'lucide-react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Doe',
    title: 'Senior Frontend Developer',
    location: 'San Francisco, CA',
    bio: 'Passionate frontend developer with 5+ years of experience building scalable web applications. Specialized in React, TypeScript, and modern web technologies.',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
    experience: [
      {
        company: 'TechCorp',
        title: 'Senior Frontend Developer',
        startDate: '2021-01',
        endDate: null,
        description: 'Leading frontend development for enterprise SaaS products.'
      },
      {
        company: 'StartupX',
        title: 'Frontend Developer',
        startDate: '2019-03',
        endDate: '2020-12',
        description: 'Developed and maintained multiple React applications.'
      }
    ],
    education: [
      {
        school: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationYear: 2019
      }
    ],
    links: [
      { type: 'linkedin', url: 'https://linkedin.com/in/johndoe' },
      { type: 'github', url: 'https://github.com/johndoe' },
      { type: 'portfolio', url: 'https://johndoe.dev' }
    ]
  });

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, save to backend here
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
        >
          {isEditing ? (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Edit className="w-5 h-5 mr-2" />
              Edit Profile
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="relative">
              <img
                src={profile.avatar}
                alt={profile.name}
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
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.title}</p>
                  <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile.location}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">About</h3>
            {isEditing ? (
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-32"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{profile.bio}</p>
            )}
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, index) => (
              <div
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >
                {skill}
                {isEditing && (
                  <button
                    onClick={() => {
                      const newSkills = [...profile.skills];
                      newSkills.splice(index, 1);
                      setProfile({ ...profile, skills: newSkills });
                    }}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => {
                  const skill = prompt('Enter new skill');
                  if (skill) {
                    setProfile({ ...profile, skills: [...profile.skills, skill] });
                  }
                }}
                className="inline-flex items-center px-3 py-1 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Skill
              </button>
            )}
          </div>
        </motion.div>

        {/* Experience */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Experience</h3>
          <div className="space-y-6">
            {profile.experience.map((exp, index) => (
              <div key={index} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-medium">{exp.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400">{exp.company}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </p>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => {
                        const newExp = [...profile.experience];
                        newExp.splice(index, 1);
                        setProfile({ ...profile, experience: newExp });
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{exp.description}</p>
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => {
                  // In a real app, show a modal or form to add experience
                  alert('Add experience form would appear here');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Experience
              </button>
            )}
          </div>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Education</h3>
          <div className="space-y-6">
            {profile.education.map((edu, index) => (
              <div key={index} className="flex justify-between items-start">
                <div>
                  <h4 className="text-gray-900 dark:text-white font-medium">{edu.school}</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {edu.degree} in {edu.field}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Graduated {edu.graduationYear}
                  </p>
                </div>
                {isEditing && (
                  <button
                    onClick={() => {
                      const newEdu = [...profile.education];
                      newEdu.splice(index, 1);
                      setProfile({ ...profile, education: newEdu });
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => {
                  // In a real app, show a modal or form to add education
                  alert('Add education form would appear here');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Education
              </button>
            )}
          </div>
        </motion.div>

        {/* Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Links</h3>
          <div className="space-y-3">
            {profile.links.map((link, index) => (
              <div key={index} className="flex items-center justify-between">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                </a>
                {isEditing && (
                  <button
                    onClick={() => {
                      const newLinks = [...profile.links];
                      newLinks.splice(index, 1);
                      setProfile({ ...profile, links: newLinks });
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => {
                  // In a real app, show a modal or form to add link
                  alert('Add link form would appear here');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Link
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;