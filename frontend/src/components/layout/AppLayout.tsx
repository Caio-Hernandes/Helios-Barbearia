import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { readStorage, writeStorage } from '../../utils/storage';
import { Brand } from '../ui/Brand';
import styles from './AppLayout.module.css';
import { Sidebar } from './Sidebar';

const COLLAPSED_KEY = 'helios.sidebar.collapsed';

/** Estrutura das páginas autenticadas: sidebar + conteúdo. */
export function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [collapsed, setCollapsed] = useState(() => readStorage(COLLAPSED_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => writeStorage(COLLAPSED_KEY, String(collapsed)), [collapsed]);

  // Esc fecha a gaveta (os links da sidebar também a fecham ao navegar)
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {isMobile && mobileOpen && <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />}

      <div className={styles.main}>
        {isMobile && (
          <header className={styles.topbar}>
            <button type="button" className="icon-btn" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <Menu size={22} />
            </button>
            <Brand />
          </header>
        )}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
