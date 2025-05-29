import React, { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { User } from '../../contexts/UserContext';
import ChipInput from './ChipInput';
import ButtonGroup from './ButtonGroup';
import Collapsible from './Collapsible';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, collection, writeBatch } from 'firebase/firestore';
import type { Resume, JobPreferences, SalaryRange } from '../../models/UserData';

type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Exec';
type SchedulePreset = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

// New interface for step 1 preferences
interface PreferencesData extends Omit<JobPreferences, 'titles'> {
    roles: string[]; // alias for titles
    locations: string[];
    companies: string[];
    skills: string[];
    jobType: JobType;
    seniority: Seniority;
    salaryRange: SalaryRange;
    other: string;
    // Schedule fields
    scheduleEnabled: boolean;
    schedulePreset: SchedulePreset;
    customSchedule: string;
    // Filter fields
    includeKeywords: string[];
    excludeKeywords: string[];
}

// Updated form data type 
interface FormDataType {
	resumeFile: File | null;
	currentRole: string;
	preferences: PreferencesData;
}

interface UserPreferencesModalProps {
	show: boolean;
	onHide: () => void;
	onSubmit: (data: FormDataType) => void;
}

// Update step labels including Filter step
const stepLabels = ['Upload', 'Preferences (Part 1)', 'Preferences (Part 2)', 'Filter', 'Schedule', 'Review'];

const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({ show, onHide, onSubmit }) => {
    const { user } = User();
	const [currentStep, setCurrentStep] = useState<number>(0);
	const [formData, setFormData] = useState<FormDataType>({
		resumeFile: null,
		currentRole: '',
		preferences: {
			roles: [],
			locations: [],
			companies: [],
			skills: [],
			jobType: 'Full-time',
			seniority: 'Junior',
			salaryRange: { min: 0, max: 100000 },
			other: '',
			// Initialize schedule fields
			scheduleEnabled: false,
			schedulePreset: 'Daily',
			customSchedule: '',
			// Initialize filter fields
			includeKeywords: [],
			excludeKeywords: [],
		},
	});

	// Refs for auto-focus
	const step1Ref = useRef<HTMLInputElement>(null);
	const step2Ref = useRef<HTMLSelectElement>(null);
	const stepScheduleRef = useRef<HTMLInputElement>(null);
	const step3Ref = useRef<HTMLInputElement>(null); // for Role step now

	useEffect(() => {
		if (currentStep === 0 && step1Ref.current) {
			step1Ref.current.focus();
		}
		if (currentStep === 1 && step2Ref.current) {
			step2Ref.current.focus();
		}
		if (currentStep === 3 && stepScheduleRef.current) {
			stepScheduleRef.current.focus();
		}
		if (currentStep === 4 && step3Ref.current) {
			step3Ref.current.focus();
		}
	}, [currentStep]);
	const handleNext = () => {
		if (currentStep < 5) setCurrentStep(prev => prev + 1); // Updated to include Filter step
	};

	const handleBack = () => {
		if (currentStep > 0) setCurrentStep(prev => prev - 1);
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const fileExt = file.name.split('.').pop()?.toLowerCase();
			if (!['pdf', 'docx', 'txt'].includes(fileExt || '')) {
				alert('Please upload a PDF, DOCX, or TXT file');
				return;
			}
			setFormData(prev => ({
				...prev,
				resumeFile: file,
			}));
		}
	};

	const removeFile = () => {
		setFormData(prev => ({ ...prev, resumeFile: null }));
	};


	// Update isStepValid: step 1 (Preferences Part 1) requires at least one role; others remain unchanged.
	const isStepValid = () => {
		if (currentStep === 0) return !!formData.resumeFile;
		if (currentStep === 1) return formData.preferences.roles.length > 0;
		if (currentStep === 3) {
			// Schedule step validation: if scheduleEnabled and preset is 'Custom', customSchedule must be non-empty.
			if (!formData.preferences.scheduleEnabled) return true;
			if (formData.preferences.schedulePreset === 'Custom') {
				return formData.preferences.customSchedule.trim() !== '';
			}
			return true;
		}
		return true; // Remove role step validation
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 0:
				return (
					<div className="space-y-4 bg-transparent">
						<div>
							<label className="block text-gray-700 mb-1">Upload Resume</label>
							<input
								type="file"
								ref={step1Ref}
								onChange={handleFileChange}
								accept=".pdf,.docx,.txt"
								className="bg-gray-50 border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
							/>
						</div>
						{formData.resumeFile && (
							<div className="mt-2 flex items-center">
								<span className="font-semibold text-gray-900">{formData.resumeFile.name}</span>
								<button
									onClick={removeFile}
									className="ml-2 bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-600 rounded-lg px-5 py-2 transition"
								>
									Remove
								</button>
							</div>
						)}
					</div>
				);
			case 1:
				return (
					<div className="grid grid-cols-1 gap-4 bg-transparent">
						<div className="text-2xl font-semibold text-gray-900">
							Preferences (Part 1)
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Desired Roles</label>
							<ChipInput
								value={formData.preferences.roles}
								onChange={(chips: string[]) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, roles: chips },
									}))
								}
								placeholder="Enter roles"
								className="border-0 dark:border-0 rounded p-3 focus:ring-indigo-500 w-full"
							/>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Preferred Locations</label>
							<ChipInput
								value={formData.preferences.locations}
								onChange={(chips: string[]) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, locations: chips },
									}))
								}
								placeholder="Enter locations"
								className="border-0 dark:border-0 rounded p-3 focus:ring-indigo-500 w-full"
							/>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Preferred Companies</label>
							<ChipInput
								value={formData.preferences.companies}
								onChange={(chips: string[]) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, companies: chips },
									}))
								}
								placeholder="Search companies"
								className="border-0 dark:border-0 rounded p-3 focus:ring-indigo-500 w-full"
							/>
						</div>
					</div>
				);
			case 2:
				return (
					<div className="grid grid-cols-1 gap-4 bg-transparent">
						<div className="text-2xl font-semibold text-gray-900">
							Preferences (Part 2)
						</div>
						<div>
							<label className="block text-gray-700 mb-1">
								Jobs Containing These Skill Sets
							</label>
							<ChipInput
								value={formData.preferences.skills}
								onChange={(chips: string[]) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, skills: chips },
									}))
								}
								placeholder="Enter skills"
								className="border-0 dark:border-0 rounded p-3 focus:ring-indigo-500 w-full"
							/>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Job Type</label>
							<ButtonGroup
								options={['Full-time', 'Part-time', 'Contract', 'Intern']}
								selected={formData.preferences.jobType}								onChange={(selected) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, jobType: selected as JobType },
									}))
								}
							/>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">
								Experience Level
							</label>
							<ButtonGroup
								options={['Junior', 'Mid', 'Senior', 'Exec']}
								selected={formData.preferences.seniority}								onChange={(selected) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, seniority: selected as Seniority },
									}))
								}
							/>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Desired Salary</label>
							<input 
								type="range"
								min="0"
								max="500000"
								value={formData.preferences.salaryRange.max}
								onChange={(e) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, salaryRange: { min: 0, max: Number(e.target.value) } }
									}))
								}
								className="border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-indigo-500 w-full"
							/>
							<div className="flex justify-between text-sm text-gray-600">
								<span>$0</span>
								<span>${formData.preferences.salaryRange.max}</span>
							</div>
						</div>
					</div>
				);
			case 3:
				return (
					<div className="grid grid-cols-1 gap-4 bg-transparent">
						<div className="text-2xl font-semibold text-gray-900">
							Filter Settings
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Include Keywords</label>
							<ChipInput
								value={formData.preferences.includeKeywords}
								onChange={(chips: string[]) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, includeKeywords: chips },
									}))
								}
								placeholder="Add keywords to include (e.g. 'remote', 'startup')"
								className="border-0 dark:border-0 rounded p-3 focus:ring-indigo-500 w-full"
							/>
							<p className="mt-1 text-sm text-gray-500">
								Listings must contain these keywords
							</p>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Exclude Keywords</label>
							<ChipInput
								value={formData.preferences.excludeKeywords}
								onChange={(chips: string[]) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, excludeKeywords: chips },
									}))
								}
								placeholder="Add keywords to exclude (e.g. '24/7 on call')"
								className="border-0 dark:border-0 rounded p-3 focus:ring-indigo-500 w-full"
							/>
							<p className="mt-1 text-sm text-gray-500">
								Listings containing these keywords will be filtered out
							</p>
						</div>
					</div>
				);
			case 4:
				return (
					<div className="mb-4 space-y-4 bg-transparent">
						<div className="text-2xl font-semibold text-gray-900">
							Schedule
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Schedule Preset</label>							<ButtonGroup
								options={['Daily', 'Weekly', 'Monthly', 'Custom']}
								selected={formData.preferences.schedulePreset}
								onChange={(selected) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, schedulePreset: selected as SchedulePreset },
									}))
								}
							/>
						</div>
						<div>
							<label className="block text-gray-700 mb-1">
								Custom Schedule (if applicable)
							</label>
							<input
								type="text"
								value={formData.preferences.customSchedule}
								onChange={(e) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, customSchedule: e.target.value },
									}))
								}
								disabled={formData.preferences.schedulePreset !== 'Custom'}
								className="border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-indigo-500 w-full"
								placeholder="e.g. 'Mon-Fri 9am-5pm'"
							/>
							<p className="mt-1 text-sm text-gray-500">
								Specify your availability if not following the preset
							</p>
						</div>
					</div>
				);
			case 5:
				return (
					<div className="bg-transparent">
						<div className="text-2xl font-semibold text-gray-900">
							Review Your Preferences
						</div>
						<div className="mt-4">
							<h3 className="text-lg font-semibold text-gray-800">
								Resume File
							</h3>
							<p className="text-gray-600">
								{formData.resumeFile ? formData.resumeFile.name : 'No file uploaded'}
							</p>
						</div>
						<div className="mt-4">
							<h3 className="text-lg font-semibold text-gray-800">
								Current Role
							</h3>
							<p className="text-gray-600">{formData.currentRole}</p>
						</div>
						<div className="mt-4">
							<h3 className="text-lg font-semibold text-gray-800">
								Job Preferences
							</h3>
							<p className="text-gray-600">
								Roles: {formData.preferences.roles.join(', ')}
							</p>
							<p className="text-gray-600">
								Locations: {formData.preferences.locations.join(', ')}
							</p>
							<p className="text-gray-600">
								Companies: {formData.preferences.companies.join(', ')}
							</p>
							<p className="text-gray-600">
								Skills: {formData.preferences.skills.join(', ')}
							</p>
							<p className="text-gray-600">
								Job Type: {formData.preferences.jobType}
							</p>
							<p className="text-gray-600">
								Seniority: {formData.preferences.seniority}
							</p>
							<p className="text-gray-600">
								Salary Range: ${formData.preferences.salaryRange.min} - ${formData.preferences.salaryRange.max}
							</p>
						</div>
						<div className="mt-4">
							<h3 className="text-lg font-semibold text-gray-800">
								Filter Settings
							</h3>
							<p className="text-gray-600">
								Include Keywords: {formData.preferences.includeKeywords.join(', ')}
							</p>
							<p className="text-gray-600">
								Exclude Keywords: {formData.preferences.excludeKeywords.join(', ')}
							</p>
						</div>
						<div className="mt-4">
							<h3 className="text-lg font-semibold text-gray-800">
								Schedule
							</h3>
							<p className="text-gray-600">
								Preset: {formData.preferences.schedulePreset}
							</p>
							{formData.preferences.schedulePreset === 'Custom' && (
								<p className="text-gray-600">
									Custom Schedule: {formData.preferences.customSchedule}
								</p>
							)}
						</div>
					</div>
				);
			default:
				return null;
		}
	};
	const handleSubmit = async () => {
		if (!isStepValid() || !user) return;

		const db = getFirestore();
		const batch = writeBatch(db);

		// Upload resume to Firebase Storage if provided
		if (formData.resumeFile) {
			const storage = getStorage();
			const fileName = `${Date.now()}-${formData.resumeFile.name}`;
			const fileRef = ref(storage, `resumes/${user.uid}/${fileName}`);
			await uploadBytes(fileRef, formData.resumeFile);
			const fileUrl = await getDownloadURL(fileRef);
			
			// Add to resumes subcollection
			const newResumeRef = doc(collection(db, 'users', user.uid, 'resumes'));
			const resumeData: Omit<Resume, 'id'> = {
				fileUrl,
				createdAt: new Date(),
				metadata: formData.currentRole || 'Primary Resume'
			};
			batch.set(newResumeRef, resumeData);
		}

		// Prepare job preferences update
		const jobPreferences: JobPreferences = {
			titles: formData.preferences.roles,
			locations: formData.preferences.locations,
			salaryRange: {
				min: formData.preferences.salaryRange.min,
				max: formData.preferences.salaryRange.max
			},
			jobType: formData.preferences.jobType,
			seniority: formData.preferences.seniority,
			other: formData.preferences.other,
			includeKeywords: formData.preferences.includeKeywords,
			excludeKeywords: formData.preferences.excludeKeywords,
			scheduleEnabled: formData.preferences.scheduleEnabled,
			schedulePreset: formData.preferences.schedulePreset,
			customSchedule: formData.preferences.customSchedule,
		};

		// Update only job preferences - preserve other user data
		const userRef = doc(db, 'users', user.uid);
		batch.update(userRef, { jobPreferences });

		// Commit all changes atomically
		try {
			await batch.commit();
			onSubmit(formData);
			onHide();
		} catch (error) {
			console.error('Error saving preferences:', error);
			alert('Error saving preferences. Please try again.');
		}
	};

	const renderFooter = () => (
		<div className="flex justify-between items-center p-4 sm:p-6 border-t border-gray-200">
			<button
				onClick={handleBack}
				disabled={currentStep === 0}
				className={`bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-600 rounded-lg px-5 py-2 transition ${
					currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''
				}`}
			>
				Back
			</button>
			<button
				onClick={async () => {
					if (currentStep === stepLabels.length - 1) {
						await handleSubmit();
					} else {
						handleNext();
					}
				}}
				disabled={!isStepValid()}
				className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-5 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{currentStep === stepLabels.length - 1 ? 'Submit' : 'Next'}
			</button>
		</div>
	);

	if (!show) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/20">
			<div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-4xl mx-4 my-6 flex flex-col max-h-[90vh]">
				{/* Header */}
				<div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">User Preferences</h2>
					<button 
						onClick={onHide}
						className="text-gray-500 hover:text-gray-700 text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
					>
						&times;
					</button>
				</div>

				{/* Progress Indicator */}
				<div className="flex space-x-2 p-4 border-b border-gray-200 overflow-x-auto">
					{stepLabels.map((label, index) => (
						<button
							key={index}
							onClick={() => setCurrentStep(index)}
							className={`px-6 py-3 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-shrink-0 min-w-[120px] flex items-center justify-center ${
								index === currentStep
									? 'bg-indigo-600 text-white'
									: 'bg-gray-100/50 text-gray-600 hover:bg-gray-200/50'
							}`}
						>
							{label}
						</button>
					))}
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-transparent">
					<div className="grid grid-cols-1 gap-4">
						{renderStepContent()}
					</div>
				</div>

				{/* Footer */}
				{renderFooter()}
			</div>
		</div>
	);
};

export default UserPreferencesModal;