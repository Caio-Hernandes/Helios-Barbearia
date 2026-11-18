import { CalendarDays, CalendarPlus, ChartPie, Clock, ListChecks, type LucideIcon } from 'lucide-react';
import type { Role } from '../types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Página inicial de cada papel. */
export function homePathFor(role: Role): string {
  return role === 'CLIENT' ? '/agendar' : '/agenda';
}

/** Itens da sidebar conforme o papel. */
export function navigationFor(role: Role): NavSection[] {
  if (role === 'CLIENT') {
    return [
      {
        title: 'Agendamento',
        items: [
          { to: '/agendar', label: 'Agendar horário', icon: CalendarPlus },
          { to: '/meus-agendamentos', label: 'Meus agendamentos', icon: ListChecks },
        ],
      },
    ];
  }

  const sections: NavSection[] = [
    {
      title: 'Atendimento',
      items: [
        { to: '/agenda', label: 'Agenda', icon: CalendarDays },
        { to: '/expediente', label: 'Expediente', icon: Clock },
      ],
    },
  ];
  if (role === 'OWNER') {
    sections.push({ title: 'Administração', items: [{ to: '/painel', label: 'Painel', icon: ChartPie }] });
  }
  return sections;
}
