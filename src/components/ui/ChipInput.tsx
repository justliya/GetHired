import React, { useState } from 'react';

interface ChipInputProps {
  value: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
  className?: string;
}

const ChipInput: React.FC<ChipInputProps> = ({ value, onChange, placeholder, className }) => {
  const [input, setInput] = useState('');

  const addChip = () => {
    const chip = input.trim();
    if (chip && !value.includes(chip)) {
      onChange([...value, chip]);
      setInput('');
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {value.map((chip, index) => (
          <span key={index} className="bg-indigo-600 text-white rounded-full px-2 py-1 flex items-center">
            {chip}
            <button onClick={() => onChange(value.filter(c => c !== chip))} className="ml-1">x</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        placeholder={placeholder}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } }}
        className="mt-2 w-full p-2 border rounded"
      />
    </div>
  );
};

export default ChipInput;
