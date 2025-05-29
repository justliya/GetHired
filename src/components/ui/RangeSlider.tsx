import React from 'react';

interface RangeSliderProps {
    min: number;
    max: number;
    value: { min: number; max: number };
    onChange: (value: { min: number; max: number }) => void;
    step?: number;
    formatValue?: (value: number) => string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
    min,
    max,
    value,
    onChange,
    step = 1000,
    formatValue = (val) => val.toString()
}) => {
    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMin = parseInt(e.target.value);
        onChange({ min: Math.min(newMin, value.max - step), max: value.max });
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMax = parseInt(e.target.value);
        onChange({ min: value.min, max: Math.max(newMax, value.min + step) });
    };

    const minPos = ((value.min - min) / (max - min)) * 100;
    const maxPos = ((value.max - min) / (max - min)) * 100;

    return (
        <div className="relative w-full pt-2">
            <div className="relative h-2">
                <div className="absolute h-2 bg-gray-200 dark:bg-gray-700 w-full rounded"></div>
                <div 
                    className="absolute h-2 bg-indigo-500 rounded"
                    style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
                ></div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value.min}
                    onChange={handleMinChange}
                    step={step}                    className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:hover:ring-4 [&::-webkit-slider-thumb]:hover:ring-indigo-200"
                    style={{
                        WebkitAppearance: 'none',
                        zIndex: 3
                    }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value.max}
                    onChange={handleMaxChange}
                    step={step}                    className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:hover:ring-4 [&::-webkit-slider-thumb]:hover:ring-indigo-200"
                    style={{
                        WebkitAppearance: 'none',
                        zIndex: 4
                    }}
                />
            </div>            <div className="flex justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{formatValue(value.min)}</span>
                <span>{formatValue(value.max)}</span>
            </div>
        </div>
    );
};

export default RangeSlider;
