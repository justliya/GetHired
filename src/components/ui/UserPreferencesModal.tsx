import React, { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import ChipInput from './ChipInput';
import Typeahead from './Typeahead';
import AsyncTypeahead from './AsyncTypeahead';
import ButtonGroup from './ButtonGroup';
import RangeSlider from './RangeSlider';
import Collapsible from './Collapsible';

// New interface for step 1 preferences
interface PreferencesData {
	roles: string[];
	locations: string[];
	companies: string[];
	skills: string[];
	jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
	seniority: 'Junior' | 'Mid' | 'Senior' | 'Exec';
	salaryRange: [number, number];
	other: string;
	// New fields for schedule
	scheduleEnabled: boolean;
	schedulePreset: 'Daily'|'Weekly'|'Monthly'|'Custom';
	customSchedule: string;
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

// Update step labels by removing 'Role'
const stepLabels = ['Upload', 'Preferences (Part 1)', 'Preferences (Part 2)', 'Schedule', 'Review'];

const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({ show, onHide, onSubmit }) => {
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
			salaryRange: [0, 100000],
			other: '',
			// Initialize new schedule fields
			scheduleEnabled: false,
			schedulePreset: 'Daily',
			customSchedule: '',
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
		if (currentStep < 4) setCurrentStep(prev => prev + 1); // Updated from 5 to 4
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

	const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
		setFormData(prev => ({ ...prev, currentRole: e.target.value }));
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
								selected={formData.preferences.jobType}
								onChange={(selected: 'Full-time' | 'Part-time' | 'Contract' | 'Intern') =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, jobType: selected },
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
								selected={formData.preferences.seniority}
								onChange={(selected: 'Junior' | 'Mid' | 'Senior' | 'Exec') =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, seniority: selected },
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
								value={formData.preferences.salaryRange[1]}
								onChange={(e) =>
									setFormData(prev => ({
										...prev,
										preferences: { ...prev.preferences, salaryRange: [0, Number(e.target.value)] }
									}))
								}
								className="border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-indigo-500 w-full"
							/>
							<div className="flex justify-between text-sm text-gray-600">
								<span>$0</span>
								<span>${formData.preferences.salaryRange[1]}</span>
							</div>
						</div>
						<div>
							<Collapsible title="Additional Preferences">
								<textarea
									value={formData.preferences.other}
									onChange={(e) =>
										setFormData(prev => ({
											...prev,
											preferences: {
												...prev.preferences,
												other: e.target.value,
											},
										}))
									}
									className="border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-indigo-500 w-full"
									placeholder="Additional preferences..."
								/>
							</Collapsible>
						</div>
					</div>
				);
			case 3:
				return (
					<div className="mb-4 space-y-4 bg-transparent">
						<div className="text-2xl font-semibold text-gray-900">
							Schedule
						</div>
						<div>
							<label className="block text-gray-700 mb-1">Schedule Preset</label>
							<ButtonGroup
								options={['Daily','Weekly','Monthly','Custom']}
								selected={formData.preferences.schedulePreset}
								onChange={(selected: 'Daily'|'Weekly'|'Monthly'|'Custom') =>
									setFormData(prev => ({
										...prev,
										preferences: { 
											...prev.preferences, 
											schedulePreset: selected,
											// Reset custom schedule when changing presets
											customSchedule: ''
										},
									}))
								}
								containerClassName="space-x-2"
								activeClass="bg-indigo-600 text-white rounded-lg"
								inactiveClass="bg-gray-100 text-gray-700 rounded-lg"
							/>
						</div>

						{/* Additional controls based on preset */}
						{formData.preferences.schedulePreset === 'Daily' && (
							<div className="space-y-2">
								<label className="block text-gray-700 mb-1">Time of Day</label>
								<input
									type="time"
									value={formData.preferences.customSchedule || '09:00'}
									onChange={(e) =>
										setFormData(prev => ({
											...prev,
											preferences: {
												...prev.preferences,
												customSchedule: e.target.value
											},
										}))
									}
									className="p-2 border rounded"
								/>
							</div>
						)}

						{formData.preferences.schedulePreset === 'Weekly' && (
							<div className="space-y-2">
								<label className="block text-gray-700 mb-1">Day of Week</label>
								<ButtonGroup
									options={['Sun','Mon','Tue','Wed','Thu','Fri','Sat']}
									selected={formData.preferences.customSchedule || 'Mon'}
									onChange={(day: string) =>
										setFormData(prev => ({
											...prev,
											preferences: {
												...prev.preferences,
												customSchedule: day
											},
										}))
									}
									containerClassName="flex flex-wrap gap-2"
									activeClass="bg-indigo-600 text-white rounded px-3 py-1"
									inactiveClass="bg-gray-100 text-gray-700 rounded px-3 py-1"
								/>
								<div className="mt-2">
									<label className="block text-gray-700 mb-1">Time</label>
									<input
										type="time"
										value={formData.preferences.customSchedule.split('@')[1] || '09:00'}
										onChange={(e) =>
											setFormData(prev => ({
												...prev,
												preferences: {
													...prev.preferences,
													customSchedule: `${prev.preferences.customSchedule.split('@')[0]}@${e.target.value}`
												},
											}))
										}
										className="p-2 border rounded"
									/>
								</div>
							</div>
						)}

						{formData.preferences.schedulePreset === 'Monthly' && (
							<div className="space-y-2">
								<label className="block text-gray-700 mb-1">Day of Month</label>
								<select
									value={formData.preferences.customSchedule.split('@')[0] || '1'}
									onChange={(e) =>
										setFormData(prev => ({
											...prev,
											preferences: {
												...prev.preferences,
												customSchedule: `${e.target.value}@${prev.preferences.customSchedule.split('@')[1] || '09:00'}`
											},
										}))
									}
									className="p-2 border rounded"
								>
									{[...Array(31)].map((_, i) => (
										<option key={i + 1} value={i + 1}>
											{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
										</option>
									))}
								</select>
								<div className="mt-2">
									<label className="block text-gray-700 mb-1">Time</label>
									<input
										type="time"
										value={formData.preferences.customSchedule.split('@')[1] || '09:00'}
										onChange={(e) =>
											setFormData(prev => ({
												...prev,
												preferences: {
													...prev.preferences,
													customSchedule: `${prev.preferences.customSchedule.split('@')[0]}@${e.target.value}`
												},
											}))
										}
										className="p-2 border rounded"
									/>
								</div>
							</div>
						)}

						{formData.preferences.schedulePreset === 'Custom' && (
							<div>
								<label className="block text-gray-700 mb-1">
									Custom Schedule
									<span className="ml-2 text-sm text-gray-500" title="Format: minute hour day month weekday">
										(Cron Syntax)
									</span>
								</label>
								<input
									type="text"
									ref={stepScheduleRef}
									placeholder="e.g. 0 9 * * 1"
									value={formData.preferences.customSchedule}
									onChange={(e) =>
										setFormData(prev => ({
											...prev,
											preferences: {
												...prev.preferences,
												customSchedule: e.target.value,
											},
										}))
									}
									className="p-2 w-full border rounded"
									title="Use standard cron syntax: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-6)"
								/>
								<p className="mt-1 text-sm text-gray-500">
									Example: "0 9 * * 1" runs every Monday at 9 AM
								</p>
							</div>
						)}
					</div>
				);
			case 4:
				return (
					<div className="space-y-6 bg-transparent pb-6">
						<h5 className="text-2xl font-semibold mb-6 text-black-950 dark:text-black-50">
							Review Your Information
						</h5>

						{/* Resume Section */}
						<section className="bg-gray-100 p-4 rounded-lg">
							<h6 className="font-semibold text-lg mb-3 text-gray-800">Resume</h6>
							<p className="text-gray-700">
								{formData.resumeFile ? (
									<span className="flex items-center">
										<svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										{formData.resumeFile.name}
									</span>
								) : 'No resume uploaded'}
							</p>
						</section>

						<section className="bg-gray-100 p-4 rounded-lg">
							<h6 className="font-semibold text-lg mb-3 text-gray-800">Primary Preferences</h6>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-sm font-medium text-gray-600">Desired Roles</p>
									<p className="text-gray-800">{formData.preferences.roles.join(', ') || 'None specified'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-600">Locations</p>
									<p className="text-gray-800">{formData.preferences.locations.join(', ') || 'None specified'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-600">Target Companies</p>
									<p className="text-gray-800">{formData.preferences.companies.join(', ') || 'None specified'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-600">Required Skills</p>
									<p className="text-gray-800">{formData.preferences.skills.join(', ') || 'None specified'}</p>
								</div>
							</div>
						</section>

						{/* Job Details */}
						<section className="bg-gray-100 p-4 rounded-lg">
							<h6 className="font-semibold text-lg mb-3 text-gray-800">Job Details</h6>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-sm font-medium text-gray-600">Job Type</p>
									<p className="text-gray-800">{formData.preferences.jobType}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-600">Experience Level</p>
									<p className="text-gray-800">{formData.preferences.seniority}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-600">Salary Range</p>
									<p className="text-gray-800">
										${formData.preferences.salaryRange[0]} - ${formData.preferences.salaryRange[1]}
									</p>
								</div>
							</div>
						</section>

						{/* Schedule Section */}
						<section className="bg-gray-100 p-4 rounded-lg">
							<div className="flex items-center justify-between mb-3">
								<h6 className="font-semibold text-lg text-gray-800">Automated Job Search</h6>
								<label className="flex items-center cursor-pointer">
									<div className="relative">
										<input
											type="checkbox"
											className="sr-only"
											checked={formData.preferences.scheduleEnabled}
											onChange={(e) =>
												setFormData(prev => ({
													...prev,
													preferences: {
														...prev.preferences,
														scheduleEnabled: e.target.checked,
													},
												}))
											}
										/>
										<div className={`block w-14 h-8 rounded-full transition-colors duration-200 ease-in-out ${formData.preferences.scheduleEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
										<div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out ${formData.preferences.scheduleEnabled ? 'transform translate-x-6' : ''}`}></div>
									</div>
									<span className="ml-3 text-sm font-medium text-gray-700">
										{formData.preferences.scheduleEnabled ? 'Enabled' : 'Disabled'}
									</span>
								</label>
							</div>
							{formData.preferences.scheduleEnabled && (
								<div className="mt-2">
									<p className="text-sm font-medium text-gray-600">Schedule Type</p>
									<p className="text-gray-800">
										{formData.preferences.schedulePreset}
										{formData.preferences.customSchedule && ` (${formData.preferences.customSchedule})`}
									</p>
								</div>
							)}
						</section>

						{formData.preferences.other && (
							<section className="bg-gray-100 p-4 rounded-lg">
								<h6 className="font-semibold text-lg mb-3 text-gray-800">Additional Preferences</h6>
								<p className="text-gray-700 whitespace-pre-wrap">{formData.preferences.other}</p>
							</section>
						)}
					</div>
				);
			default:
				return null;
		}
	};

	if (!show) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/20">
			<div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-4xl mx-4 my-6 flex flex-col max-h-[90vh]">
				{/* Fixed Header */}
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

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-transparent">
					<div className="grid grid-cols-1 gap-4">
						{renderStepContent()}
					</div>
				</div>

				{/* Fixed Footer */}
				<div className="flex justify-between items-center p-4 sm:p-6 border-t border-gray-200">
					<button
						onClick={handleBack}
						disabled={currentStep === 0}
						className={`bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-600 rounded-lg px-5 py-2 transition ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
					>
						Back
					</button>
					{currentStep < stepLabels.length - 1 ? (
						<button
							onClick={handleNext}
							disabled={!isStepValid()}
							className={`bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-5 py-2 transition ${!isStepValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
						>
							Next
						</button>
					) : (
						<button
							onClick={() => onSubmit(formData)}
							className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-5 py-2 transition"
						>
							Submit
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default UserPreferencesModal;