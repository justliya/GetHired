import React from 'react';

interface ButtonGroupProps {
  options: string[];
  selected: string;
  onChange: (selected: string) => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ options, selected, onChange }) => {
  return (
    <div className="flex gap-2">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onChange(option)}
          className={`px-4 py-2 rounded-lg ${selected === option ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;
