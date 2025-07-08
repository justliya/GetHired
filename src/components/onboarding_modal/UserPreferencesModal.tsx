import React, { useState, useEffect } from 'react';
import { User } from '../../context/UserContext';
import ChipInput from './ChipInput';
import RangeSlider from './RangeSlider';
import type { 
    JobPreferences, 
    SalaryRange, 
    SearchSchedule,
    Resume,
    SearchFrequency,
    NotificationType 
} from '../../types';
import ScheduleConfig from './ScheduleConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getUserResumes, getResumeUrlForContext, uploadResumeWithFallback } from '../../services/firebaseService';

type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead';

interface PreferencesData extends Omit<JobPreferences, 'titles'> {
    roles: string[]; // alias for titles
    locations: string[];
    companies: string[];
    skills: string[];
    jobType: JobType;
    seniority: Seniority;
    salaryRange: SalaryRange;
    other: string;
    includeKeywords: string[];
    excludeKeywords: string[];
    searchSchedule: SearchSchedule;
}

interface FormDataType {
    resumeFile: File | null;
    currentRole: string;
    preferences: PreferencesData;
}

interface UserPreferencesModalProps {
    show: boolean;
    onHide: () => void;
    onSubmit: (data: FormDataType) => void;
    existingSchedule?: {
        preferences?: JobPreferences;
        schedule?: SearchSchedule;
    };
}

// Update step labels
const stepLabels = ['Upload', 'Preferences 1', 'Preferences 2', 'Filter', 'Schedule', 'Review'];

const stepDescriptions = {
    upload: {
        title: "Upload Resume",
        description: "Start by uploading your resume. This will help us tailor job recommendations to your experience and skills."
    },
    basicPrefs: {
        title: "Basic Preferences",
        description: "Tell us about the roles and locations you're interested in. This helps us find the most relevant opportunities."
    },
    advancedPrefs: {
        title: "Advanced Preferences",
        description: "Specify your desired skills, job type, and compensation expectations to further refine your job search."
    },
    filters: {
        title: "Search Filters",
        description: "Fine-tune your search by adding specific keywords to include or exclude from job listings."
    },
    schedule: {
        title: "Search Schedule",
        description: "Configure when and how often you'd like us to search for new job opportunities."
    }
};

interface ResumeData extends Resume {
    id: string;
}

const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({ 
    show, 
    onHide, 
    onSubmit, 
    existingSchedule 
}) => {
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [resumes, setResumes] = useState<ResumeData[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormDataType>({
        resumeFile: null,
        currentRole: '',
        preferences: {
            roles: [],
            locations: [],
            companies: [],
            skills: [],
            jobType: 'Full-time',
            seniority: 'Mid',
            salaryRange: { min: 0, max: 2000000 },
            other: '',
            includeKeywords: [],
            excludeKeywords: [],
            searchSchedule: {
                enabled: false,
                frequency: 'Daily' as SearchFrequency,
                customSchedule: '09:00',
                notificationType: 'Email' as NotificationType,
                quietHours: {
                    start: '22:00',
                    end: '08:00'
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        }
    });    const { user } = User();
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
    const [resumeError, setResumeError] = useState<string | null>(null);

    const handleScheduleChange = (scheduleUpdate: Partial<SearchSchedule>) => {
        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                searchSchedule: {
                    ...prev.preferences.searchSchedule,
                    ...scheduleUpdate
                }
            }
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            if (user?.uid) {
                // Use existing schedule data if provided (for editing), otherwise fetch from Firebase
                let preferences: JobPreferences | null = null;
                
                if (existingSchedule?.preferences) {
                    preferences = existingSchedule.preferences;
                } else {
                    // Fetch preferences using the correct Firestore document path
                    const preferencesRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(preferencesRef);
                    
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        preferences = userData?.jobPreferences as JobPreferences;
                    }
                }
                
                if (preferences) {
                    // Use schedule from existingSchedule if available, otherwise from preferences
                    const scheduleData = existingSchedule?.schedule || preferences.searchSchedule;
                    
                    setFormData(prev => ({
                        ...prev,
                        preferences: {
                            ...prev.preferences,
                            roles: preferences.titles || [],
                            companies: preferences.companies || [],
                            skills: preferences.skills || [],
                            locations: preferences.locations || [],
                            salaryRange: {
                                min: preferences.salaryRange?.min || 0,
                                max: preferences.salaryRange?.max || 2000000
                            },
                            jobType: preferences.jobType || 'Full-time',
                            seniority: preferences.seniority || 'Mid',
                            other: preferences.other || '',
                            includeKeywords: preferences.includeKeywords || [],
                            excludeKeywords: preferences.excludeKeywords || [],
                            searchSchedule: scheduleData || {
                                enabled: false,
                                frequency: 'Daily',
                                customSchedule: '09:00',
                                notificationType: 'Email',
                                quietHours: {
                                    start: '22:00',
                                    end: '08:00'
                                },
                                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            }
                        }
                    }));
                }
            }
        };

        fetchData();
    }, [user?.uid, existingSchedule]);

    useEffect(() => {
        const fetchResumes = async () => {
            if (!user?.uid) return;
            try {
                // Use the correct resume service endpoint
                const result = await getUserResumes(user.uid);
                if (result.success && result.data) {
                    setResumes(result.data.map((r: Resume & { id: string }) => ({ ...r, id: r.id })));
                    if (result.data.length > 0 && !selectedResumeId) {
                        setSelectedResumeId((result.data[0] as Resume & { id: string }).id);
                    }
                } else {
                    setResumeError('Could not fetch resumes.');
                }
            } catch {
                setResumeError('Error fetching resumes.');
            }
        };
        fetchResumes();
        // eslint-disable-next-line
    }, [user?.uid]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user?.uid || !e.target.files?.[0]) return;
        setResumeError(null);
        try {
            const file = e.target.files[0];
            
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setResumeError('File size must be less than 10MB');
                return;
            }
            
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            if (!allowedTypes.includes(file.type)) {
                setResumeError('Please upload a PDF, DOCX, or TXT file');
                return;
            }
            
            const metadata = {
                title: file.name,
                uploadSource: 'manual' as const,
                isOriginal: true,
                keywords: formData.preferences.roles || [],
            };
            
            console.log('🔄 Starting resume upload in UserPreferencesModal...', file.name);
            
            // Use the enhanced upload service with GCS priority
            const result = await uploadResumeWithFallback(user.uid, file, metadata);
            
            if (result.success && result.data) {
                console.log('✅ Resume upload successful:', result.data);
                setResumes(prev => [...prev, result.data as ResumeData]);
                setSelectedResumeId(result.data.id);
                setFormData(prev => ({ ...prev, resumeFile: file }));
            } else {
                console.error('❌ Resume upload failed:', result);
                setResumeError(result.error || 'Failed to upload resume. Please try again.');
            }
        } catch (error) {
            console.error('❌ Resume upload error:', error);
            setResumeError('Error uploading resume. Please check your connection and try again.');
        }
    };

    const handleSelectResume = (resumeId: string) => {
        setSelectedResumeId(resumeId);
        setFormData(prev => ({ ...prev, resumeFile: null }));
    };

    const handleSubmit = async () => {
        // Prevent multiple submissions
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            // Let the parent handle all the complex logic
            // Just pass the form data and close the modal
            onSubmit({ ...formData });
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            setResumeError('Error saving preferences.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render functions
    const renderUploadStep = () => (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {stepDescriptions.upload.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                    {stepDescriptions.upload.description}
                </p>
            </div>
            {/* Default Resume Section */}
            {resumes.length > 0 && (
                <div className="mb-4">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Default Resume</div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                        <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {/* Safely access the metadata */}
                                {resumes[0]?.metadata?.title || resumes[0]?.fileUrl?.split('/').pop() || 'Untitled Resume'}
                            </span>
                            <a 
                                href={getResumeUrlForContext(resumes[0])} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="ml-2 text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                            >
                                View
                            </a>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded font-medium transition-colors ${
                                    selectedResumeId === resumes[0]?.id 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                                onClick={() => handleSelectResume(resumes[0]?.id)}
                            >
                                {selectedResumeId === resumes[0]?.id ? 'Using Default' : 'Use Default'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Upload Section */}
            <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, or TXT</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                    />
                </label>
            </div>
            {formData.resumeFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formData.resumeFile.name}
                    </span>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, resumeFile: null }))}
                        className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                    >
                        Remove
                    </button>
                </div>
            )}
            {resumeError && <div className="text-red-600 text-sm mb-2">{resumeError}</div>}
        </div>
    );

    const renderBasicPreferencesStep = () => (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {stepDescriptions.basicPrefs.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                    {stepDescriptions.basicPrefs.description}
                </p>
            </div>
            
            <div className="space-y-4">
                <ChipInput
                    label="Job Roles"
                    placeholder="Add job roles..."
                    value={formData.preferences.roles}
                    onChange={(roles) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, roles }
                    }))}
                />
                
                <ChipInput
                    label="Locations"
                    placeholder="Add locations..."
                    value={formData.preferences.locations}
                    onChange={(locations) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, locations }
                    }))}
                />
                
                <ChipInput
                    label="Target Companies"
                    placeholder="Add companies..."
                    value={formData.preferences.companies}
                    onChange={(companies) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, companies }
                    }))}
                />
            </div>
        </div>
    );

    const renderAdvancedPreferencesStep = () => (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {stepDescriptions.advancedPrefs.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                    {stepDescriptions.advancedPrefs.description}
                </p>
            </div>
            
            <div className="space-y-6">
                <ChipInput
                    label="Required Skills"
                    placeholder="Add skills..."
                    value={formData.preferences.skills}
                    onChange={(skills) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, skills }
                    }))}
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Job Type
                        </label>
                        <select
                            value={formData.preferences.jobType}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, jobType: e.target.value as JobType }
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                        >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Intern">Intern</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Seniority Level
                        </label>
                        <select
                            value={formData.preferences.seniority}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                preferences: { ...prev.preferences, seniority: e.target.value as Seniority }
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                        >
                            <option value="Junior">Junior</option>
                            <option value="Mid">Mid-Level</option>
                            <option value="Senior">Senior</option>
                            <option value="Exec">Executive</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Salary Range (USD)
                    </label>
                    <RangeSlider
                        min={0}
                        max={2000000}
                        step={5000}
                        value={formData.preferences.salaryRange}
                        onChange={(value) => setFormData(prev => ({
                            ...prev,
                            preferences: {
                                ...prev.preferences,
                                salaryRange: value
                            }
                        }))}
                        formatValue={(val) => new Intl.NumberFormat('en-US', { 
                            style: 'currency', 
                            currency: 'USD',
                            maximumFractionDigits: 0 
                        }).format(val)}
                    />
                </div>
            </div>
        </div>
    );

    const renderFiltersStep = () => (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {stepDescriptions.filters.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                    {stepDescriptions.filters.description}
                </p>
            </div>
            
            <div className="space-y-4">
                <ChipInput
                    label="Include Keywords"
                    placeholder="Add keywords to include..."
                    value={formData.preferences.includeKeywords}
                    onChange={(includeKeywords) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, includeKeywords }
                    }))}
                />
                
                <ChipInput
                    label="Exclude Keywords"
                    placeholder="Add keywords to exclude..."
                    value={formData.preferences.excludeKeywords}
                    onChange={(excludeKeywords) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, excludeKeywords }
                    }))}
                />
            </div>
        </div>
    );

    const renderScheduleStep = () => (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {stepDescriptions.schedule.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                    {stepDescriptions.schedule.description}
                </p>
            </div>
            
            <ScheduleConfig
                schedule={formData.preferences.searchSchedule}
                onChange={handleScheduleChange}
            />
        </div>
    );

    const renderReviewStep = () => {
        const formatSalary = (amount: number) => 
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

        const formatTime = (time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        const SectionTitle = ({ children }: { children: React.ReactNode }) => (
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{children}</h4>
        );

        const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
            <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            </div>
        );

        return (
            <div className="space-y-6">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Review Your Preferences
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                        Please review all your preferences before finalizing.
                    </p>
                </div>
                
                <div className="space-y-6">
                    {/* Resume Section */}
                    <div>
                        <SectionTitle>Resume</SectionTitle>
                        <DetailRow 
                            label="Uploaded Resume"
                            value={formData.resumeFile?.name || 'No resume uploaded'}
                        />
                    </div>

                    {/* Basic Preferences Section */}
                    <div>
                        <SectionTitle>Basic Preferences</SectionTitle>
                        <div className="space-y-2">
                            <DetailRow 
                                label="Job Roles"
                                value={formData.preferences.roles.length > 0 
                                    ? formData.preferences.roles.join(', ')
                                    : 'None specified'}
                            />
                            <DetailRow 
                                label="Locations"
                                value={formData.preferences.locations.length > 0 
                                    ? formData.preferences.locations.join(', ')
                                    : 'None specified'}
                            />
                            <DetailRow 
                                label="Target Companies"
                                value={formData.preferences.companies.length > 0 
                                    ? formData.preferences.companies.join(', ')
                                    : 'None specified'}
                            />
                        </div>
                    </div>

                    {/* Advanced Preferences Section */}
                    <div>
                        <SectionTitle>Advanced Preferences</SectionTitle>
                        <div className="space-y-2">
                            <DetailRow 
                                label="Required Skills"
                                value={formData.preferences.skills.length > 0 
                                    ? formData.preferences.skills.join(', ')
                                    : 'None specified'}
                            />
                            <DetailRow 
                                label="Job Type"
                                value={formData.preferences.jobType}
                            />
                            <DetailRow 
                                label="Seniority Level"
                                value={formData.preferences.seniority}
                            />
                            <DetailRow 
                                label="Salary Range"
                                value={`${formatSalary(formData.preferences.salaryRange.min)} - ${formatSalary(formData.preferences.salaryRange.max)}`}
                            />
                        </div>
                    </div>

                    {/* Search Filters Section */}
                    <div>
                        <SectionTitle>Search Filters</SectionTitle>
                        <div className="space-y-2">
                            <DetailRow 
                                label="Include Keywords"
                                value={formData.preferences.includeKeywords.length > 0 
                                    ? formData.preferences.includeKeywords.join(', ')
                                    : 'None specified'}
                            />
                            <DetailRow 
                                label="Exclude Keywords"
                                value={formData.preferences.excludeKeywords.length > 0 
                                    ? formData.preferences.excludeKeywords.join(', ')
                                    : 'None specified'}
                            />
                        </div>
                    </div>

                    {/* Schedule Section */}
                    <div>
                        <SectionTitle>Search Schedule</SectionTitle>
                        <div className="space-y-2">
                            <DetailRow 
                                label="Status"
                                value={formData.preferences.searchSchedule.enabled ? 'Enabled' : 'Disabled'}
                            />
                            {formData.preferences.searchSchedule.enabled && (
                                <>
                                    <DetailRow 
                                        label="Frequency"
                                        value={formData.preferences.searchSchedule.frequency}
                                    />
                                    <DetailRow 
                                        label="Time"
                                        value={formatTime(formData.preferences.searchSchedule.customSchedule || '09:00')}
                                    />
                                    <DetailRow 
                                        label="Notification Type"
                                        value={formData.preferences.searchSchedule.notificationType}
                                    />
                                    {formData.preferences.searchSchedule.quietHours && (
                                        <DetailRow 
                                            label="Quiet Hours"
                                            value={`${formatTime(formData.preferences.searchSchedule.quietHours.start)} - ${formatTime(formData.preferences.searchSchedule.quietHours.end)}`}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderUploadStep();
            case 1:
                return renderBasicPreferencesStep();
            case 2:
                return renderAdvancedPreferencesStep();
            case 3:
                return renderFiltersStep();
            case 4:
                return renderScheduleStep();
            case 5:
                return renderReviewStep();
            default:
                return null;
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            <nav className="flex items-center space-x-2" aria-label="Progress">
                {stepLabels.map((label, index) => (
                    <button
                        key={label}
                        onClick={() => setCurrentStep(index)}
                        disabled={isSubmitting}
                        className={`relative flex items-center ${
                            index <= currentStep ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                        } ${index === currentStep ? 'font-semibold' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <span className="absolute -bottom-[20px] text-xs whitespace-nowrap">
                            {label}
                        </span>
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${
                            index < currentStep 
                                ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400' 
                                : index === currentStep
                                ? 'border-indigo-600 dark:border-indigo-400'
                                : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            {index < currentStep ? (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className={index === currentStep ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}>
                                    {index + 1}
                                </span>
                            )}
                        </span>
                        {index < stepLabels.length - 1 && (
                            <div className={`h-0.5 w-10 mx-2 ${
                                index < currentStep ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );

    const handleNext = () => {
        if (currentStep < stepLabels.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
                {/* Close button */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                        onClick={onHide}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress indicator */}
                {renderStepIndicator()}

                {/* Content */}
                <div className="mt-8 max-h-[calc(100vh-16rem)] overflow-y-auto">
                    {renderStepContent()}
                </div>

                {/* Navigation */}
                <div className="mt-8 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                            currentStep === 0 ? 'sm:col-start-2' : ''
                        }`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </div>
                        ) : (
                            currentStep === stepLabels.length - 1 ? 'Finish' : 'Next'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserPreferencesModal;
