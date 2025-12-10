import React, { useEffect, useRef, useState } from 'react';
import './DualRangeSlider.css';

const DualRangeSlider = ({ 
  min, 
  max, 
  minValue, 
  maxValue, 
  onChange, 
  step = 1,
  label = '',
  formatValue = (val) => val,
  icon = ''
}) => {
  const [localMinValue, setLocalMinValue] = useState(minValue || min);
  const [localMaxValue, setLocalMaxValue] = useState(maxValue || max);
  const [activeThumb, setActiveThumb] = useState(null);
  const minRef = useRef(null);
  const maxRef = useRef(null);
  const rangeRef = useRef(null);

  useEffect(() => {
    setLocalMinValue(minValue || min);
    setLocalMaxValue(maxValue || max);
  }, [minValue, maxValue, min, max]);

  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), localMaxValue - step);
    setLocalMinValue(value);
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), localMinValue + step);
    setLocalMaxValue(value);
  };

  const handleMouseUp = () => {
    setActiveThumb(null);
    onChange(localMinValue === min ? '' : localMinValue, localMaxValue === max ? '' : localMaxValue);
  };

  const getPercentage = (value) => {
    return ((value - min) / (max - min)) * 100;
  };

  const minPercent = getPercentage(localMinValue);
  const maxPercent = getPercentage(localMaxValue);

  return (
    <div className="dual-range-slider">
      <div className="dual-range-label">
        {icon && <span className="dual-range-icon">{icon}</span>}
        <span>{label}</span>
      </div>
      
      <div className="dual-range-values">
        <span className="dual-range-value">{formatValue(localMinValue)}</span>
        <span className="dual-range-separator">—</span>
        <span className="dual-range-value">{formatValue(localMaxValue)}</span>
      </div>

      <div className="dual-range-container">
        <div className="dual-range-track-wrapper">
          <div 
            className="dual-range-track"
            ref={rangeRef}
          />
          <div 
            className="dual-range-track-active"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`
            }}
          />
          
          <input
            type="range"
            ref={minRef}
            min={min}
            max={max}
            step={step}
            value={localMinValue}
            onChange={handleMinChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onMouseDown={() => setActiveThumb('min')}
            onTouchStart={() => setActiveThumb('min')}
            className="dual-range-input dual-range-input-min"
          />

          <input
            type="range"
            ref={maxRef}
            min={min}
            max={max}
            step={step}
            value={localMaxValue}
            onChange={handleMaxChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onMouseDown={() => setActiveThumb('max')}
            onTouchStart={() => setActiveThumb('max')}
            className="dual-range-input dual-range-input-max"
          />
        </div>
      </div>
    </div>
  );
};

export default DualRangeSlider;
