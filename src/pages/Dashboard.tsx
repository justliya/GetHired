import React from 'react';
import { 
  Search, 
  FileText, 
  Building2, 
  ClipboardList, 
  Speech, 
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import Card from '../components/ui/Card';
import AgentCard from '../components/ui/AgentCard';
import Button from '../components/ui/Button';
import { type Page } from "../types";

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const agentCards = [
    { 
      id: 'jobs',
      title: 'Job Discovery Agent', 
      description: 'Find relevant jobs matching your skills and preferences',
      icon: <Search size={24} />,
      color: 'primary'
    },
    { 
      id: 'resume',
      title: 'Resume Tailoring Agent', 
      description: 'Optimize your resume for specific job postings',
      icon: <FileText size={24} />,
      color: 'secondary'
    },
    { 
      id: 'company',
      title: 'Company Research Agent', 
      description: 'Gather insights about potential employers',
      icon: <Building2 size={24} />,
      color: 'accent'
    },
    { 
      id: 'applications',
      title: 'Application Tracker', 
      description: 'Monitor your job applications and follow-ups',
      icon: <ClipboardList size={24} />,
      color: 'success'
    },
    { 
      id: 'interview',
      title: 'Interview Prep Agent', 
      description: 'Practice with customized interview questions',
      icon: <Speech size={24} />,
      color: 'warning'
    },
    { 
      id: 'networking',
      title: 'Networking Agent', 
      description: 'Find connections and draft outreach messages',
      icon: <Users size={24} />,
      color: 'primary'
    },
  ];

  const stats = [
    { label: 'Active Applications', value: '12' },
    { label: 'Jobs Found', value: '56' },
    { label: 'Interviews', value: '3' },
    { label: 'Network Connections', value: '5' },
  ];

  const upcomingTasks = [
    { task: 'Follow up on Google application', date: 'Today' },
    { task: 'Interview with Amazon', date: 'Tomorrow, 10:00 AM' },
    { task: 'Update LinkedIn profile', date: 'Oct 15' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
        <p className="mt-2 text-gray-600">Your job search assistants are ready to help you today.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Assistants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentCards.map((agent) => (
              <AgentCard
                key={agent.id}
                title={agent.title}
                description={agent.description}
                icon={agent.icon}
                color={agent.color}
                onClick={() => onNavigate(agent.id as Page)}
              />
            ))}
          </div>
        </div>
        
        <div className="md:col-span-1 space-y-6">
          <Card 
            title="Upcoming Tasks" 
            icon={<Clock size={18} />} 
            className="h-full"
          >
            <div className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="flex justify-between items-start pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{task.task}</p>
                    <p className="text-xs text-gray-500">{task.date}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Complete
                  </Button>
                </div>
              ))}
            </div>
          </Card>
          
          <Card 
            title="Weekly Progress" 
            icon={<TrendingUp size={18} />}
          >
            <div className="flex items-center justify-center h-32 bg-gray-50 rounded-md">
              <p className="text-gray-500">Progress chart will appear here</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;