import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { roleLabel } from '../../utils/format';
import { navigationFor } from '../../utils/navigation';
import { Avatar } from '../ui/Avatar';
import { Brand } from '../ui/Brand';
import styles from './Sidebar.module.css';

interface SidebarProps {
  /** Só ícones (desktop). */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Modo gaveta (celular/tablet). */
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, isMobile, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  if (!user) return null;

  const compact = collapsed && !isMobile;
  const className = [styles.sidebar, compact && styles.collapsed, isMobile && styles.mobile, mobileOpen && styles.open]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={className} aria-label="Menu principal">
      <div className={styles.top}>
        <Brand compact={compact} />
        {isMobile && (
          <button type="button" className="icon-btn" onClick={onCloseMobile} aria-label="Fechar menu">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className={styles.nav}>
        {navigationFor(user.role).map((section) => (
          <div key={section.title} className={styles.section}>
            {compact ? <hr className={styles.divider} /> : <span className={styles.sectionTitle}>{section.title}</span>}
            {section.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={compact ? label : undefined}
                onClick={isMobile ? onCloseMobile : undefined}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              >
                <Icon size={20} strokeWidth={1.8} />
                {!compact && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {compact ? (
          <button
            type="button"
            className={`icon-btn ${styles.centered}`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        ) : (
          <div className={styles.themeToggle} role="group" aria-label="Tema">
            <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              <Sun size={16} /> Claro
            </button>
            <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Moon size={16} /> Escuro
            </button>
          </div>
        )}

        <div className={`${styles.userCard} ${compact ? styles.userCardCompact : ''}`}>
          <Avatar name={user.name} />
          {!compact && (
            <div className={styles.userInfo}>
              <strong>{user.name}</strong>
              <span>{roleLabel[user.role]}</span>
            </div>
          )}
          <button type="button" className="icon-btn" onClick={() => void logout()} aria-label="Sair" title="Sair">
            <LogOut size={18} />
          </button>
        </div>

        {!isMobile && (
          <button type="button" className={styles.collapseBtn} onClick={onToggleCollapsed}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!compact && <span>Recolher menu</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
