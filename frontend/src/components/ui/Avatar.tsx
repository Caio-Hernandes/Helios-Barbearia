import { initials } from '../../utils/format';
import styles from './Avatar.module.css';

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
