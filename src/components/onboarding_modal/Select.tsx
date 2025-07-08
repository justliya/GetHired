import React from 'react';

interface SelectProps {
  isMulti?: boolean;
  options: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

const Select: React.FC<SelectProps> = ({ isMulti, options, value, onChange, placeholder, className }) => {
  return (
    <select
      multiple={isMulti}
      value={value}
      onChange={e => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        onChange(selectedOptions);
      }}
      className={`${className} w-full p-2 border rounded`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option, index) => (
        <option key={index} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default Select;
