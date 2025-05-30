import React, { useState } from 'react';

interface ChipInputProps {
  value: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

const ChipInput: React.FC<ChipInputProps> = ({ value, onChange, placeholder, className, label }) => {
  const [input, setInput] = useState('');

  const addChip = () => {
    const chip = input.trim();
    if (chip && !value.includes(chip)) {
      onChange([...value, chip]);
      setInput('');
    }
  };

  const removeChip = (chipToRemove: string) => {
    onChange(value.filter(chip => chip !== chipToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip();
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      removeChip(value[value.length - 1]);
    }
  };

  return (
    <div className={`w-full ${className || ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2 p-2 border rounded-md dark:border-gray-600 bg-white dark:bg-gray-800">
        {value.map((chip, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-md text-sm"
          >
            <span>{chip}</span>
            <button
              type="button"
              onClick={() => removeChip(chip)}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
            >
              ×
            </button>
          </div>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input.trim() && addChip()}
          placeholder={placeholder}
          className="flex-1 min-w-[100px] bg-transparent border-none focus:ring-0 p-1 text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>
    </div>
  );
};

export default ChipInput;
