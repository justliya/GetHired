import React, { useState } from 'react';

interface TypeaheadProps {
  multiple?: boolean;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

const Typeahead: React.FC<TypeaheadProps> = ({ options, selected, onChange, placeholder, className }) => {
  const [query, setQuery] = useState('');
  const filtered = options.filter(opt => opt.toLowerCase().includes(query.toLowerCase()));

  const addOption = (option: string) => {
    if (!selected.includes(option)) {
      onChange([...selected, option]);
    }
    setQuery('');
  };

  return (
    <div className={className}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={e => setQuery(e.target.value)}
        className="w-full p-2 border rounded"
      />
      {query && filtered.length > 0 && (
        <ul className="border rounded mt-1 max-h-40 overflow-y-auto">
          {filtered.map((item, index) => (
            <li key={index} className="p-2 hover:bg-gray-200 cursor-pointer" onClick={() => addOption(item)}>
              {item}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {selected.map((sel, idx) => (
          <span key={idx} className="bg-indigo-600 text-white rounded-full px-2 py-1 flex items-center">
            {sel}
            <button onClick={() => onChange(selected.filter(item => item !== sel))} className="ml-1">x</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default Typeahead;
