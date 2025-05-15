import React, { useState } from 'react';
import { Plus, ExternalLink, Mail, Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type ApplicationStatus = 'applied' | 'interview' | 'offer' | 'rejected' | 'no-response';

interface Application {
  id: number;
  company: string;
  position: string;
  location: string;
  appliedDate: string;
  status: ApplicationStatus;
  nextStep?: {
    type: string;
    date: string;
  };
}

const ApplicationTracker: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'all'>('all');
  
  // Mock data for demonstration
  const applications: Application[] = [
    {
      id: 1,
      company: 'TechCorp Inc.',
      position: 'Senior Frontend Developer',
      location: 'San Francisco, CA (Remote)',
      appliedDate: '2023-10-10',
      status: 'interview',
      nextStep: {
        type: 'Technical Interview',
        date: '2023-10-20',
      },
    },
    {
      id: 2,
      company: 'InnovateSoft',
      position: 'Full Stack Engineer',
      location: 'New York, NY',
      appliedDate: '2023-10-05',
      status: 'applied',
    },
    {
      id: 3,
      company: 'WebSolutions',
      position: 'React Developer',
      location: 'Austin, TX (Remote)',
      appliedDate: '2023-09-28',
      status: 'offer',
      nextStep: {
        type: 'Offer Review',
        date: '2023-10-18',
      },
    },
    {
      id: 4,
      company: 'DesignHub',
      position: 'UI/UX Developer',
      location: 'Seattle, WA',
      appliedDate: '2023-09-15',
      status: 'rejected',
    },
    {
      id: 5,
      company: 'DataWorks',
      position: 'Frontend Engineer',
      location: 'Boston, MA',
      appliedDate: '2023-09-10',
      status: 'no-response',
    },
  ];

  const statusColors: Record<ApplicationStatus, string> = {
    'applied': 'bg-primary-100 text-primary-700',
    'interview': 'bg-accent-100 text-accent-700',
    'offer': 'bg-success-50 text-success-700',
    'rejected': 'bg-error-50 text-error-700',
    'no-response': 'bg-gray-100 text-gray-700',
  };
  
  const statusIcons: Record<ApplicationStatus, React.ReactNode> = {
    'applied': <Mail size={14} />,
    'interview': <Calendar size={14} />,
    'offer': <CheckCircle size={14} />,
    'rejected': <XCircle size={14} />,
    'no-response': <Clock size={14} />,
  };

  const statusLabels: Record<ApplicationStatus, string> = {
    'applied': 'Applied',
    'interview': 'Interview',
    'offer': 'Offer',
    'rejected': 'Rejected',
    'no-response': 'No Response',
  };

  const filteredApplications = activeFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === activeFilter);

  const counts = {
    all: applications.length,
    applied: applications.filter(app => app.status === 'applied').length,
    interview: applications.filter(app => app.status === 'interview').length,
    offer: applications.filter(app => app.status === 'offer').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    'no-response': applications.filter(app => app.status === 'no-response').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-xl font-semibold text-gray-800">Your Applications</h2>
        <Button 
          variant="primary" 
          size="sm" 
          icon={<Plus size={16} />}
          className="mt-2 sm:mt-0"
        >
          Add Application
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`p-3 rounded-lg text-center transition-colors ${
            activeFilter === 'all' 
              ? 'bg-primary-100 text-primary-700 border border-primary-200' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-lg font-semibold">{counts.all}</div>
          <div className="text-xs font-medium">All</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('applied')}
          className={`p-3 rounded-lg text-center transition-colors ${
            activeFilter === 'applied' 
              ? 'bg-primary-100 text-primary-700 border border-primary-200' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-lg font-semibold">{counts.applied}</div>
          <div className="text-xs font-medium">Applied</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('interview')}
          className={`p-3 rounded-lg text-center transition-colors ${
            activeFilter === 'interview' 
              ? 'bg-accent-100 text-accent-700 border border-accent-200' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-lg font-semibold">{counts.interview}</div>
          <div className="text-xs font-medium">Interview</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('offer')}
          className={`p-3 rounded-lg text-center transition-colors ${
            activeFilter === 'offer' 
              ? 'bg-success-50 text-success-700 border border-success-200' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-lg font-semibold">{counts.offer}</div>
          <div className="text-xs font-medium">Offer</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('rejected')}
          className={`p-3 rounded-lg text-center transition-colors ${
            activeFilter === 'rejected' 
              ? 'bg-error-50 text-error-700 border border-error-200' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-lg font-semibold">{counts.rejected}</div>
          <div className="text-xs font-medium">Rejected</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('no-response')}
          className={`p-3 rounded-lg text-center transition-colors ${
            activeFilter === 'no-response' 
              ? 'bg-gray-100 text-gray-700 border border-gray-200' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-lg font-semibold">{counts['no-response']}</div>
          <div className="text-xs font-medium">No Response</div>
        </button>
      </div>
      
      <div className="space-y-4">
        {filteredApplications.map((application) => (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="font-semibold text-lg text-gray-900">{application.position}</h3>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center ${statusColors[application.status]}`}>
                    {statusIcons[application.status]}
                    <span className="ml-1">{statusLabels[application.status]}</span>
                  </span>
                </div>
                <p className="text-gray-600">{application.company}</p>
                <p className="text-sm text-gray-500">{application.location}</p>
                <p className="text-xs text-gray-400 mt-1">Applied: {new Date(application.appliedDate).toLocaleDateString()}</p>
              </div>
              
              {application.nextStep && (
                <div className="mt-4 md:mt-0 md:ml-4 p-3 bg-accent-50 rounded-md flex items-start">
                  <AlertCircle size={16} className="text-accent-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent-700">{application.nextStep.type}</p>
                    <p className="text-xs text-accent-600">{new Date(application.nextStep.date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-4 md:mt-0 md:ml-4 flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  icon={<ExternalLink size={14} />}
                >
                  View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  icon={<Mail size={14} />}
                >
                  Follow Up
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredApplications.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No applications found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationTracker;