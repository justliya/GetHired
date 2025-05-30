import React, { useState } from 'react';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
}

const Collapsible: React.FC<CollapsibleProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-t-lg"
      >
        {title} {isOpen ? '-' : '+'}
      </button>
      {isOpen && <div className="p-3">{children}</div>}
    </div>
  );
};

export default Collapsible;
