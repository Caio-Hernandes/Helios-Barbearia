import styles from './Brand.module.css';

interface BrandProps {
  /** Esconde o texto (sidebar recolhida). */
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={styles.brand}>
      <div className={styles.logo} aria-hidden="true">
        H
      </div>
      {!compact && (
        <div className={styles.text}>
          <strong>Hélios</strong>
          <span>Barbearia</span>
        </div>
      )}
    </div>
  );
}
