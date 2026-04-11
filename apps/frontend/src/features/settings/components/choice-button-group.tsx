import styles from '../settings-page.module.css';

interface ChoiceButtonOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceButtonGroupProps<T extends string> {
  value: T;
  options: ChoiceButtonOption<T>[];
  onChange: (value: T) => void;
}

export const ChoiceButtonGroup = <T extends string>({
  value,
  options,
  onChange,
}: ChoiceButtonGroupProps<T>) => (
  <div className={styles.genderBtns}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={`${styles.genderBtn} ${value === option.value ? styles.genderActive : ''}`}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
