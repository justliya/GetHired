import React, {type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface AgentCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  color?: string;
}

const AgentCard: React.FC<AgentCardProps> = ({ title, description, icon, onClick, color = 'primary' }) => {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-500',
    warning: 'bg-warning-50 text-warning-500',
    error: 'bg-error-50 text-error-500',
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start">
          <div className={`p-2 rounded-md ${colorClasses[color]} mr-4`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-lg mb-1">{title}</h3>
            <p className="text-gray-600 text-sm">{description}</p>
          </div>
          <div className="ml-2 text-gray-400">
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;