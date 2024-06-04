import React from 'react';

interface SliderProps {
  label: string;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({
  label,
  name,
  min,
  max,
  step,
  value,
  format,
  onChange,
  disabled,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        type="range"
        id={name}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
      />
      <span>{format ? format(value) : value}</span>
    </div>
  );
};

export default Slider;
