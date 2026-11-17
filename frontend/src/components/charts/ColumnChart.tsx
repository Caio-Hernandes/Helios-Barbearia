import { useEffect, useId, useRef, useState } from 'react';
import styles from './ColumnChart.module.css';

export interface ColumnDatum {
  key: string;
  /** Rótulo curto no eixo X (ex.: "17/11", "09h", "Ter") */
  label: string;
  value: number;
  /** Título do tooltip (ex.: "Terça-feira, 17 de novembro") */
  title: string;
  /** Linhas extras do tooltip (ex.: "R$ 230,00 de faturamento") */
  details?: string[];
}

interface ColumnChartProps {
  data: ColumnDatum[];
  /** Nome do gráfico para leitores de tela */
  ariaLabel: string;
  /** Formata o valor no tooltip (ex.: "3 atendimentos") */
  formatValue: (value: number) => string;
  height?: number;
}

const MARGIN = { top: 12, right: 4, bottom: 26, left: 32 };
const MAX_BAR = 24;
const RADIUS = 4;

/** Topo do eixo Y em número "redondo" e o passo entre as marcações (inteiros: são contagens). */
function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow);
  const intStep = Math.ceil(step);
  return { top: Math.ceil(max / intStep) * intStep, step: intStep };
}

/** Coluna com topo arredondado e base reta, apoiada na linha de base. */
function columnPath(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  if (h <= 0) return '';
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
}

/** Gráfico de colunas de uma série, com tooltip no hover e no foco do teclado. */
export function ColumnChart({ data, ariaLabel, formatValue, height = 200 }: ColumnChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const base = MARGIN.top + plotH;
  const { top, step } = niceScale(Math.max(0, ...data.map((d) => d.value)));
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const yOf = (v: number) => MARGIN.top + plotH - (v / top) * plotH;

  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(MAX_BAR, band * 0.62));
  // Mostra só alguns rótulos no eixo X quando não cabem todos
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 44))));

  const activeDatum = active !== null ? data[active] : undefined;
  const tooltipLeft =
    active !== null ? Math.min(Math.max(MARGIN.left + band * (active + 0.5), 80), Math.max(80, width - 80)) : 0;
  const tooltipTop = activeDatum ? Math.min(yOf(activeDatum.value), base - 4) - 10 : 0;

  return (
    <div
      ref={containerRef}
      className={styles.root}
      // No toque, o "leave" dispara ao levantar o dedo: só limpa o tooltip para mouse
      onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} aria-describedby={tableId}>
          {/* Grade e eixo Y */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yOf(t)}
                y2={yOf(t)}
                className={t === 0 ? styles.baseline : styles.grid}
              />
              <text x={MARGIN.left - 8} y={yOf(t)} className={styles.yTick}>
                {t}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const bandX = MARGIN.left + band * i;
            const x = bandX + (band - barW) / 2;
            const isActive = active === i;
            return (
              <g key={d.key}>
                <path
                  d={columnPath(x, yOf(d.value), barW, base)}
                  className={`${styles.bar} ${active !== null && !isActive ? styles.dimmed : ''}`}
                />
                {i % labelEvery === 0 && (
                  <text x={bandX + band / 2} y={base + 17} className={styles.xTick}>
                    {d.label}
                  </text>
                )}
                {/* Área de hover/foco: a faixa inteira, maior que a coluna */}
                <rect
                  x={bandX}
                  y={MARGIN.top}
                  width={band}
                  height={plotH}
                  className={styles.hit}
                  tabIndex={0}
                  aria-label={`${d.title}: ${formatValue(d.value)}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {activeDatum && (
        <div className={styles.tooltip} style={{ left: tooltipLeft, top: tooltipTop }} role="status">
          <strong>{formatValue(activeDatum.value)}</strong>
          <span>{activeDatum.title}</span>
          {activeDatum.details?.map((line) => (
            <span key={line} className={styles.detail}>
              {line}
            </span>
          ))}
        </div>
      )}

      {/* Mesmos dados em tabela, para leitores de tela */}
      <table id={tableId} className={styles.srOnly}>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
