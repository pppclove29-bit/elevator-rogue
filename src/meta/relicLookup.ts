/**
 * 렐릭 통합 lookup — 일반 RELICS + DEVIL_RELICS + ANGEL_RELICS 모두 합산.
 * fragile/tags 등 메타 조회용.
 */
import { ANGEL_RELICS, DEVIL_RELICS } from './deals';
import { RELICS, RelicEntry } from './relics';

export interface RelicMeta {
  id: string;
  name: string;
  desc: string;
  fragile?: { conditionId: string; params?: any };
  tags?: string[];
}

export function relicMeta(id: string): RelicMeta | null {
  const r = RELICS[id] as RelicEntry | undefined;
  if (r) {
    return { id, name: r.name, desc: r.desc, fragile: r.fragile, tags: r.tags };
  }
  const d = DEVIL_RELICS[id] ?? ANGEL_RELICS[id];
  if (d) {
    return { id, name: d.name, desc: d.desc, fragile: d.fragile };
  }
  return null;
}
