import styles from './SettingsLayout.module.css';

export interface RadioOptionDef<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SegmentedRadioProps<T extends string> {
  name: string;
  options: RadioOptionDef<T>[];
  value: T;
  onChange: (val: T) => void;
}

export function SegmentedRadio<T extends string>({
  name,
  options,
  value,
  onChange,
}: SegmentedRadioProps<T>) {
  return (
    <div className={styles.radioGroup}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <label
            key={opt.value}
            className={`${styles.radioOption} ${isSelected ? styles.radioOptionActive : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className={styles.radioInput}
            />
            <div className={styles.radioText}>
              <span className={styles.radioTitle}>{opt.label}</span>
              {opt.description && <span className={styles.radioDesc}>{opt.description}</span>}
            </div>
          </label>
        );
      })}
    </div>
  );
}
