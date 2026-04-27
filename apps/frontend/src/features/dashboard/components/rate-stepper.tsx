import React from 'react';
import { Minus, Plus } from 'lucide-react';
import styles from '../dashboard.module.css';

interface RateStepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  unit: string;
  decreaseLabel: string;
  increaseLabel: string;
  fmtNumber: (n: number) => string;
}

export const RateStepper: React.FC<RateStepperProps> = ({
  value,
  onChange,
  min,
  max,
  label,
  unit,
  decreaseLabel,
  increaseLabel,
  fmtNumber,
}) => {
  return (
    <div className={styles.rateCalc}>
      <span className={styles.rateLabel}>{label}</span>
      <div className={styles.rateStepper}>
        <button
          type="button"
          className={styles.rateBtn}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={decreaseLabel}
          disabled={value <= min}
        >
          <Minus size={12} />
        </button>
        <span className={styles.rateVal}>{fmtNumber(value)}</span>
        <button
          type="button"
          className={styles.rateBtn}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={increaseLabel}
          disabled={value >= max}
        >
          <Plus size={12} />
        </button>
      </div>
      <span className={styles.rateUnit}>{unit}</span>
    </div>
  );
};
