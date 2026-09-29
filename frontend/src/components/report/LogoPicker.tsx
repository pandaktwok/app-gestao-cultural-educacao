import React from 'react';
import { ArrowLeft, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { API_ORIGIN } from '../../lib/api';

export interface SccsLogo {
  id: string;
  nome: string;
  tipo: string;
  nivel: string | null;
  qualidade: string;
  nota: string;
  url: string;
}

export interface LogoSelection {
  projeto: string[];
  apoiadores: string[];
  publicos: string[];
  patrocinadores: string[];
  ordem?: 'edital';
}

export const EMPTY_LOGO_SELECTION: LogoSelection = { projeto: ['musicos-do-futuro'], apoiadores: [], publicos: [], patrocinadores: [] };

/** Padrão do projeto: Prefeitura de Criciúma na extrema direita, Secretaria Municipal de Educação à esquerda dela (padrão de edital). */
export const DEFAULT_LOGO_SELECTION: LogoSelection = {
  projeto: ['musicos-do-futuro'],
  apoiadores: [],
  publicos: ['prefeitura-criciuma', 'sme-criciuma'],
  patrocinadores: [],
  ordem: 'edital'
};

type GroupKey = 'projeto' | 'apoiadores' | 'publicos' | 'patrocinadores';

const GROUPS: { key: GroupKey; title: string; hint: string; tipos: string[] }[] = [
  { key: 'projeto', title: 'Projeto', hint: 'ao lado da logo da SCCS', tipos: ['projeto'] },
  { key: 'apoiadores', title: 'Apoiadores', hint: 'segunda linha', tipos: ['apoiador'] },
  { key: 'publicos', title: 'Órgãos públicos e fundos', hint: 'governos por nível, depois fundos', tipos: ['orgao-publico', 'fundo'] },
  { key: 'patrocinadores', title: 'Patrocinadores', hint: 'do maior para o menor patrocinador', tipos: ['patrocinador'] },
];

interface Props {
  registry: SccsLogo[];
  value: LogoSelection;
  onChange: (next: LogoSelection) => void;
}

/** Escolha e ordem das logos do documento (a skill exige confirmar a ordem antes de gerar). */
export const LogoPicker: React.FC<Props> = ({ registry, value, onChange }) => {
  const byId = new Map(registry.map((l) => [l.id, l]));

  const update = (key: GroupKey, ids: string[]) => onChange({ ...value, [key]: ids });
  const move = (key: GroupKey, index: number, delta: number) => {
    const ids = [...value[key]];
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    update(key, ids);
  };

  return (
    <div className="space-y-3 bg-white p-4 rounded-2xl border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h5 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Logos do documento</h5>
        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.ordem === 'edital'}
            onChange={(e) => onChange({ ...value, ordem: e.target.checked ? 'edital' : undefined })}
          />
          Padrão de edital (governos à direita, federal na ponta)
        </label>
      </div>
      <p className="text-[11px] text-gray-500 font-medium">
        A logo da SCCS entra sempre. A ordem abaixo é a ordem no documento, da esquerda para a direita.
      </p>

      {GROUPS.map((g) => {
        const available = registry.filter((l) => g.tipos.includes(l.tipo) && !value[g.key].includes(l.id));
        return (
          <div key={g.key} className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-gray-800">
              {g.title} <span className="font-medium text-gray-400">· {g.hint}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {value[g.key].length === 0 && <span className="text-[11px] text-gray-400 italic">Nenhuma selecionada</span>}
              {value[g.key].map((id, i) => {
                const l = byId.get(id);
                return (
                  <div key={id} className="flex items-center gap-1.5 border rounded-xl px-2 py-1 bg-emerald-50 border-emerald-200">
                    {l && <img src={`${API_ORIGIN}${l.url}`} alt="" className="h-5 w-auto object-contain" />}
                    <span className="text-[11px] font-bold text-gray-800">{l?.nome ?? id}</span>
                    {l && l.qualidade !== 'ok' && (
                      <span title={l.nota || 'Arquivo de baixa resolução'} className="text-amber-600">
                        <AlertTriangle size={12} />
                      </span>
                    )}
                    <button type="button" onClick={() => move(g.key, i, -1)} disabled={i === 0} aria-label="Mover para a esquerda" className="disabled:opacity-30 p-2 -m-1">
                      <ArrowLeft size={12} />
                    </button>
                    <button type="button" onClick={() => move(g.key, i, 1)} disabled={i === value[g.key].length - 1} aria-label="Mover para a direita" className="disabled:opacity-30 p-2 -m-1">
                      <ArrowRight size={12} />
                    </button>
                    <button type="button" onClick={() => update(g.key, value[g.key].filter((x) => x !== id))} aria-label="Remover" className="text-rose-600 p-2 -m-1">
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {available.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {available.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => update(g.key, [...value[g.key], l.id])}
                    className="flex items-center gap-1.5 border rounded-xl px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700"
                  >
                    <img src={`${API_ORIGIN}${l.url}`} alt="" className="h-4 w-auto object-contain" />+ {l.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
