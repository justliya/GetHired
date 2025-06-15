import React from 'react';

interface ButtonGroupProps {
  options: string[];
  selected: string;
  onChange: (selected: string) => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ options, selected, onChange }) => {
  return (    <div className="flex flex-wrap gap-2">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onChange(option)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selected === option 
              ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;
