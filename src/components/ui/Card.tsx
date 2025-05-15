import React, { type ReactNode } from 'react';

interface CardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '', onClick, hover = false }) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${
        hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {(title || icon) && (
        <div className="p-4 border-b border-gray-100 flex items-center">
          {icon && <div className="mr-3 text-primary-600">{icon}</div>}
          {title && <h3 className="font-medium text-gray-800">{title}</h3>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};

export default Card;