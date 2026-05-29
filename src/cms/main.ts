/**
 * CMS 페이지 — 게임 데이터 폼 편집 → data/*.json 저장.
 *
 * 5개 탭: 다이얼로그 / 스킬 / 모디파이어 / 층 / 승객
 * 모두 동일 패턴: 좌측 목록 + 우측 폼.
 */
import dialogData from '../../data/dialog.json';
import skillData from '../../data/skills.json';
import modifierData from '../../data/modifiers.json';
import floorData from '../../data/floors.json';
import archetypeData from '../../data/archetypes.json';

type Tab = 'dialog' | 'skills' | 'modifiers' | 'floors' | 'archetypes';

// ─── effectId 메타데이터 (한글 설명 + 파라미터 스키마 + 미리보기) ─────────
interface ParamSchema {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text';
  options?: string[];
  default?: unknown;
  hint?: string;
}
interface EffectMeta {
  name: string;
  desc: string;
  params: ParamSchema[];
  preview: (p: any) => string;
}

const PHASE_KO: Record<string, string> = {
  morning: '출근', work: '근무', lunch: '점심', evening: '퇴근', night: '야간',
};

function fmtFactor(f: number, label: string, invert = false): string {
  // 스폰 간격은 invert=true: 0.6=빠름, 1.4=느림
  if (f === 1) return `${label} 변화 없음`;
  if (invert) {
    return f < 1 ? `${label} ${(1 / f).toFixed(2)}배 더 자주 발생` : `${label} ${f.toFixed(2)}배 더 드물게 발생`;
  }
  return f > 1 ? `${label} +${((f - 1) * 100).toFixed(0)}%` : `${label} -${((1 - f) * 100).toFixed(0)}%`;
}

const MODIFIER_EFFECTS_META: Record<string, EffectMeta> = {
  'phase-spawn-mul': {
    name: '특정 페이즈 스폰 빈도 조정',
    desc: '한 페이즈(출근/근무/점심/퇴근/야간)의 손님 스폰 간격을 배수로 조정',
    params: [
      { key: 'phase', label: '대상 페이즈', type: 'select', options: ['morning', 'work', 'lunch', 'evening', 'night'] },
      { key: 'factor', label: '간격 배수 (작을수록 더 빨리 스폰)', type: 'number', default: 0.6, hint: '예: 0.6 → 약 1.67배 빠름. 1.4 → 약 30% 느림.' },
    ],
    preview: (p) => {
      const ph = PHASE_KO[p.phase] ?? '?';
      const f = Number(p.factor ?? 1);
      return `${ph} 시간대에 ${fmtFactor(f, '스폰 빈도', true)}`;
    },
  },
  'anger-all-mul': {
    name: '불만 누적 속도 전체 조정',
    desc: '모든 손님의 불만(분노) 게이지 차오르는 속도를 배수로 조정 (대기 + 탑승 둘 다)',
    params: [
      { key: 'factor', label: '불만 누적 배수 (1보다 크면 더 빨리 화남)', type: 'number', default: 1.4 },
    ],
    preview: (p) => `손님 불만 누적 속도 ${fmtFactor(Number(p.factor ?? 1), '', false)}`,
  },
  'speed-mul': {
    name: '엘리베이터 이동 속도',
    desc: '모든 엘리베이터의 층 이동 속도를 배수로 조정',
    params: [
      { key: 'factor', label: '속도 배수', type: 'number', default: 1.2 },
    ],
    preview: (p) => `엘베 속도 ${fmtFactor(Number(p.factor ?? 1), '', false)}`,
  },
  'load-tick-add': {
    name: '정차 시간 가감',
    desc: '엘베가 층에서 멈추는 기본 시간(tick)에 더하거나 뺌. 1 tick ≈ 50ms',
    params: [
      { key: 'delta', label: '추가 tick (음수면 단축)', type: 'number', default: 4 },
    ],
    preview: (p) => {
      const d = Number(p.delta ?? 0);
      return d > 0 ? `엘베 정차 시간 +${d} tick (느려짐)` : d < 0 ? `엘베 정차 시간 ${d} tick (빨라짐)` : '변화 없음';
    },
  },
  'capacity-add': {
    name: '엘리베이터 정원 가감',
    desc: '모든 엘베의 정원(태울 수 있는 손님 수)을 가감',
    params: [
      { key: 'delta', label: '정원 변화 (음수면 감소)', type: 'number', default: -2 },
      { key: 'min', label: '최소 정원 (이하로 안 내려감)', type: 'number', default: 2 },
    ],
    preview: (p) => {
      const d = Number(p.delta ?? 0);
      return d > 0 ? `엘베 정원 +${d}명 (최대 늘어남)` : d < 0 ? `엘베 정원 ${d}명 (좁아짐, 최소 ${p.min ?? 1})` : '변화 없음';
    },
  },
  'spawn-global-mul': {
    name: '전체 스폰 간격 조정',
    desc: '모든 페이즈의 손님 스폰 간격을 동시에 배수로 조정',
    params: [
      { key: 'factor', label: '간격 배수 (작을수록 더 자주 스폰)', type: 'number', default: 1.4 },
    ],
    preview: (p) => `전 페이즈 ${fmtFactor(Number(p.factor ?? 1), '스폰 빈도', true)}`,
  },
  'skill-cd-mul': {
    name: '스킬 쿨다운 조정',
    desc: '스킬 재사용 대기 시간을 배수로 조정',
    params: [
      { key: 'factor', label: '쿨다운 배수 (작을수록 빨리 재사용)', type: 'number', default: 0.5 },
    ],
    preview: (p) => `스킬 쿨다운 ${fmtFactor(Number(p.factor ?? 1), '', false)}`,
  },
  'floor-capacity-add': {
    name: '층 대기열 상한 가감',
    desc: '각 층의 대기 가능한 손님 수(큐 상한)를 가감. 상한 도달 시 손님 불만 ↑',
    params: [
      { key: 'delta', label: '상한 변화 (양수면 여유, 음수면 빡빡)', type: 'number', default: 3 },
    ],
    preview: (p) => {
      const d = Number(p.delta ?? 0);
      return d > 0 ? `각 층 대기 상한 +${d}명` : d < 0 ? `각 층 대기 상한 ${d}명 (빡빡함)` : '변화 없음';
    },
  },
  'fire-drill': {
    name: '🔥 화재 대피 (일회성)',
    desc: '시작 시 랜덤 한 층의 큐에 손님 4명 즉시 추가. 다른 효과는 없음',
    params: [],
    preview: () => '시작 즉시 랜덤 1개 층에 손님 4명 push (그 외 효과 없음)',
  },
  'rush-rewards': {
    name: '위기는 곧 기회 (스폰 ↑ + 보상)',
    desc: '전체 스폰 간격을 줄여서 손님이 몰리지만, 즉시 골드 보너스 지급',
    params: [
      { key: 'factor', label: '스폰 간격 배수 (작을수록 더 빨리)', type: 'number', default: 0.66 },
      { key: 'gold', label: '즉시 지급 골드', type: 'number', default: 30 },
    ],
    preview: (p) => `전체 ${fmtFactor(Number(p.factor ?? 1), '스폰 빈도', true)} + 시작 시 +${p.gold ?? 0}G`,
  },
  'marathon': {
    name: '마라톤 데이 (느리지만 길게)',
    desc: '스폰 간격은 늘고(한산), 불만 누적도 줄어듦 (장시간 운영 모드)',
    params: [
      { key: 'spawnFactor', label: '스폰 간격 배수 (>1=한산)', type: 'number', default: 1.4 },
      { key: 'angerFactor', label: '불만 배수 (<1=관대)', type: 'number', default: 0.8 },
    ],
    preview: (p) => `${fmtFactor(Number(p.spawnFactor ?? 1), '스폰 빈도', true)} + 불만 누적 ${fmtFactor(Number(p.angerFactor ?? 1), '', false)}`,
  },
  'vip-protocol': {
    name: 'VIP 의전 (속도 ↑ + 정원 ↓)',
    desc: '엘베 속도가 빨라지지만 정원이 줄어듦',
    params: [
      { key: 'speedFactor', label: '속도 배수', type: 'number', default: 1.2 },
      { key: 'capDelta', label: '정원 변화', type: 'number', default: -1 },
      { key: 'capMin', label: '최소 정원', type: 'number', default: 1 },
    ],
    preview: (p) => `엘베 속도 ${fmtFactor(Number(p.speedFactor ?? 1), '', false)}, 정원 ${p.capDelta ?? 0}명 (최소 ${p.capMin ?? 1})`,
  },
};

const SKILL_EFFECTS_META: Record<string, { name: string; desc: string }> = {
  'anger-relief': { name: '서비스 회복',  desc: '시전 즉시 모든 손님(대기 + 탑승)의 불만 게이지를 절반으로' },
  'warp-lobby':   { name: '전원 1F 집결', desc: '모든 엘베에게 즉시 "1층으로 이동" 명령. 진행 중 행동 무시' },
  'clear-largest':{ name: '비상 처리',    desc: '가장 큰 대기열 1개 층의 손님을 모두 즉시 도착 처리 (불만 가득 차도 처리됨)' },
  'slow-spawn':   { name: '한산한 시간',  desc: '20초간 (400 tick) 전체 스폰 간격 ×2 — 손님 절반 속도로 등장' },
};

interface TabSpec {
  id: Tab;
  label: string;
  file: string;
  data: Record<string, any>;
  newEntryFactory: () => any;
  fields: FieldSpec[];
}

interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'json' | 'phase-weights' | 'effect-id' | 'effect-params';
  options?: string[];
  placeholder?: string;
  /** effect-id 타입 시 어떤 종류 (modifier|skill) */
  effectKind?: 'modifier' | 'skill';
}

// ─── 탭 정의 ────────────────────────────────────────────────
const SPEAKERS = ['narrator', 'mentor', 'owner', 'player'];

// 다이얼로그는 라인 배열 구조라 별도 처리.
const TABS: Record<Tab, TabSpec> = {
  dialog: {
    id: 'dialog', label: '💬 다이얼로그', file: 'dialog.json',
    data: JSON.parse(JSON.stringify(dialogData)),
    newEntryFactory: () => [{ speaker: 'mentor', text: '새 대사' }],
    fields: [], // 특수 처리
  },
  skills: {
    id: 'skills', label: '🎯 스킬', file: 'skills.json',
    data: JSON.parse(JSON.stringify(skillData)),
    newEntryFactory: () => ({ name: '새 스킬', desc: '', cooldownTicks: 1200, cost: 50, effectId: 'anger-relief' }),
    fields: [
      { key: 'name', label: '이름 (게임에 표시)', type: 'text' },
      { key: 'desc', label: '설명 (툴팁/카드)', type: 'textarea' },
      { key: 'cooldownTicks', label: '쿨다운 (tick. 20 tick ≈ 1초)', type: 'number' },
      { key: 'cost', label: '비용 (골드)', type: 'number' },
      { key: 'effectId', label: '효과 종류', type: 'effect-id', effectKind: 'skill' },
    ],
  },
  modifiers: {
    id: 'modifiers', label: '✨ 모디파이어', file: 'modifiers.json',
    data: JSON.parse(JSON.stringify(modifierData)),
    newEntryFactory: () => ({ name: '새 모디파이어', desc: '', type: 'debuff', effectId: 'phase-spawn-mul', params: { phase: 'morning', factor: 0.6 } }),
    fields: [
      { key: 'name', label: '이름 (게임에 표시)', type: 'text' },
      { key: 'desc', label: '설명 (카드 텍스트)', type: 'textarea' },
      { key: 'type', label: '카드 타입', type: 'select', options: ['debuff', 'buff', 'mixed'] },
      { key: 'effectId', label: '효과 종류', type: 'effect-id', effectKind: 'modifier' },
      { key: 'params', label: '효과 파라미터', type: 'effect-params' },
    ],
  },
  floors: {
    id: 'floors', label: '🏢 층 역할', file: 'floors.json',
    data: JSON.parse(JSON.stringify(floorData)),
    newEntryFactory: () => ({ nameKo: '새 층', shortEn: 'XX', color: '#888888', goldPerVisit: 1, desc: '' }),
    fields: [
      { key: 'nameKo', label: '한글 이름', type: 'text' },
      { key: 'shortEn', label: '영문 약자 (2자)', type: 'text' },
      { key: 'color', label: '색상 (#rrggbb)', type: 'color' },
      { key: 'goldPerVisit', label: '방문당 매출 (G)', type: 'number' },
      { key: 'desc', label: '설명', type: 'textarea' },
    ],
  },
  archetypes: {
    id: 'archetypes', label: '👥 승객', file: 'archetypes.json',
    data: JSON.parse(JSON.stringify(archetypeData)),
    newEntryFactory: () => ({
      name: '새 손님', desc: '', color: '#888888',
      goldMultiplier: 1, angerMultiplier: 1, spaceCost: 1,
      loadTickBonus: 0, fastBonus: 1, groupSize: 1, weightByPhase: {},
    }),
    fields: [
      { key: 'name', label: '이름', type: 'text' },
      { key: 'desc', label: '설명', type: 'textarea' },
      { key: 'color', label: '색상 (#rrggbb)', type: 'color' },
      { key: 'goldMultiplier', label: '골드 배수', type: 'number' },
      { key: 'angerMultiplier', label: '불만 누적 배수', type: 'number' },
      { key: 'spaceCost', label: '정원 차지', type: 'number' },
      { key: 'loadTickBonus', label: '추가 정차 tick', type: 'number' },
      { key: 'fastBonus', label: '빠른 처리 보너스 배수', type: 'number' },
      { key: 'groupSize', label: '그룹 크기 (1=단일)', type: 'number' },
      { key: 'weightByPhase', label: '페이즈별 스폰 가중치 (0=등장 안 함)', type: 'phase-weights' },
    ],
  },
};

let currentTab: Tab = 'dialog';
let activeKey: string | null = null;
let dirty: Record<Tab, boolean> = { dialog: false, skills: false, modifiers: false, floors: false, archetypes: false };
/** sidebar 검색어 (탭별로 분리). 빈 문자열이면 전체 표시. */
let searchByTab: Record<Tab, string> = { dialog: '', skills: '', modifiers: '', floors: '', archetypes: '' };

function resetActiveKey(): void {
  const keys = Object.keys(TABS[currentTab].data);
  activeKey = keys[0] ?? null;
}
resetActiveKey();

// ─── DOM 유틸 ────────────────────────────────────────────────
const root = document.getElementById('root')!;

function el(tag: string, props: Record<string, any> = {}, ...children: (Node | string)[]): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') (e as any)[k.toLowerCase()] = v;
    else (e as any)[k] = v;
  }
  for (const c of children) {
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function toast(msg: string, kind: 'ok' | 'error' = 'ok'): void {
  const t = el('div', { class: kind === 'error' ? 'toast error' : 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
}

async function save(): Promise<void> {
  const spec = TABS[currentTab];
  try {
    const res = await fetch(`/_api/save-data?file=${spec.file}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(spec.data, null, 2),
    });
    if (res.ok) {
      dirty[currentTab] = false;
      toast(`저장 완료 → data/${spec.file}`);
      render();
    } else {
      toast(`저장 실패: ${await res.text()}`, 'error');
    }
  } catch (e) {
    toast(`에러: ${String(e)}`, 'error');
  }
}

// ─── 렌더 ────────────────────────────────────────────────
function renderHeader(): HTMLElement {
  const dirtyTabs = (Object.entries(dirty) as Array<[Tab, boolean]>).filter(([, d]) => d).map(([t]) => TABS[t].label);
  const totalEntries = (Object.values(TABS) as TabSpec[]).reduce((a, s) => a + Object.keys(s.data).length, 0);

  const statusChip = dirtyTabs.length > 0
    ? el('span', {
        style: 'background: var(--danger); color: #0b0b10; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: bold;',
        title: dirtyTabs.join(', '),
      }, `● 미저장 ${dirtyTabs.length}`)
    : el('span', {
        style: 'background: var(--success); color: #0b0b10; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: bold;',
      }, '✓ 저장됨');

  return el('div', { class: 'cms-header' },
    el('h1', {}, '분주한 승강씨 CMS'),
    el('span', { class: 'subtitle' }, '코드 없이 게임 데이터 편집 · data/*.json 직접 저장'),
    el('span', { style: 'flex: 1;' }),
    el('span', { style: 'color: var(--text-dim); font-size: 11px; margin-right: 12px;' }, `전체 ${totalEntries}개 항목`),
    statusChip,
    el('a', { class: 'game-link', href: '/', target: '_blank', style: 'margin-left: 12px;' }, '게임 ↗')
  );
}

function renderTabs(): HTMLElement {
  const tabs = (Object.values(TABS) as TabSpec[]).map((spec) => {
    const cls = spec.id === currentTab ? 'cms-tab active' : 'cms-tab';
    const dirtyMark = dirty[spec.id] ? ' *' : '';
    return el('button', {
      class: cls,
      onClick: () => { currentTab = spec.id; resetActiveKey(); render(); },
    }, `${spec.label}${dirtyMark}`);
  });
  return el('div', { class: 'cms-tabs' }, ...tabs);
}

/** entry 의 검색 매칭 텍스트 추출 — id + name + desc 등 사람이 입력한 문자열 모두. */
function entrySearchableText(id: string, entry: any): string {
  if (currentTab === 'dialog') {
    const lines = entry as Array<{ speaker: string; text: string }>;
    return `${id} ${lines.map((l) => `${l.speaker} ${l.text}`).join(' ')}`.toLowerCase();
  }
  const fields = ['name', 'nameKo', 'desc', 'shortEn', 'effectId', 'type'];
  return [id, ...fields.map((f) => (entry as Record<string, unknown>)[f] ?? '')].join(' ').toLowerCase();
}

function renderSidebar(): HTMLElement {
  const spec = TABS[currentTab];
  const allIds = Object.keys(spec.data).sort();
  const q = searchByTab[currentTab].trim().toLowerCase();
  const ids = q ? allIds.filter((id) => entrySearchableText(id, spec.data[id]).includes(q)) : allIds;

  const items = ids.map((id) => {
    const entry = spec.data[id];
    const cls = id === activeKey ? 'script-item active' : 'script-item';
    const countLabel = currentTab === 'dialog' ? `${(entry as any[]).length}줄` : '';
    const row = el('div', {
      class: cls,
      onClick: () => { activeKey = id; render(); },
    },
      el('span', { style: 'flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;' }, id),
      countLabel ? el('span', { class: 'count', style: 'margin-right: 6px;' }, countLabel) : el('span', { style: 'margin-right: 6px;' }),
      // 복제 버튼 (event stopPropagation 으로 row 클릭과 분리)
      el('button', {
        class: 'secondary', style: 'padding: 2px 6px; font-size: 11px;', title: '복제 (Cmd+D)',
        onClick: (e: MouseEvent) => { e.stopPropagation(); duplicateEntry(id); },
      }, '📋'),
      // 삭제 버튼
      el('button', {
        class: 'danger', style: 'padding: 2px 6px; font-size: 11px; margin-left: 2px;', title: '삭제',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          if (!confirm(`"${id}" 삭제?`)) return;
          delete spec.data[id];
          if (activeKey === id) {
            const remaining = Object.keys(spec.data);
            activeKey = remaining[0] ?? null;
          }
          dirty[currentTab] = true;
          render();
        },
      }, '✕'),
    );
    return row;
  });

  return el('div', { class: 'cms-sidebar' },
    el('div', { style: 'padding: 4px 6px 10px;' },
      el('h3', { style: 'margin: 0 0 8px;' }, `${spec.label} 목록`),
      el('input', {
        id: 'cms-search', type: 'text', placeholder: '검색... (/ 로 포커스)',
        value: searchByTab[currentTab],
        style: 'width: 100%; padding: 6px 10px; background: var(--row); color: var(--text); border: 1px solid var(--border); border-radius: 4px; font-size: 12px;',
        onInput: (e: Event) => {
          searchByTab[currentTab] = (e.target as HTMLInputElement).value;
          // input value 만 갱신해도 충분 — sidebar 목록 다시 그리되 input focus 유지
          render();
          const after = document.getElementById('cms-search') as HTMLInputElement | null;
          if (after) { after.focus(); after.setSelectionRange(after.value.length, after.value.length); }
        },
      }),
      q ? el('div', { style: 'color: var(--text-dim); font-size: 11px; margin-top: 4px;' },
        `${ids.length} / ${allIds.length} 매칭`) : el('span'),
    ),
    ...items,
    el('div', { style: 'margin-top: 12px; padding: 0 6px;' },
      el('button', {
        class: 'secondary',
        style: 'width: 100%; font-size: 12px;',
        onClick: () => createNewEntry(),
      }, '+ 새 항목 (Cmd+N)')
    )
  );
}

/** 현재 탭에 새 항목 만들기 — 단축키와 sidebar 버튼 공유. */
function createNewEntry(): void {
  const spec = TABS[currentTab];
  const id = prompt(`새 ${spec.label} ID`);
  if (!id || spec.data[id]) return;
  spec.data[id] = spec.newEntryFactory();
  activeKey = id;
  dirty[currentTab] = true;
  render();
}

/** 항목 복제 — id 끝에 -copy / -copy-2 등 suffix 자동. */
function duplicateEntry(id: string): void {
  const spec = TABS[currentTab];
  const source = spec.data[id];
  if (!source) return;
  let suffix = '-copy';
  let newId = `${id}${suffix}`;
  let n = 2;
  while (spec.data[newId]) { newId = `${id}-copy-${n}`; n += 1; }
  // 깊은 복사
  spec.data[newId] = JSON.parse(JSON.stringify(source));
  activeKey = newId;
  dirty[currentTab] = true;
  render();
}

function renderDialogContent(): HTMLElement {
  const spec = TABS.dialog;
  if (!activeKey) return el('div', { class: 'cms-content' }, el('div', { class: 'empty' }, '스크립트 선택'));
  const lines = spec.data[activeKey] as Array<{ speaker: string; text: string; portrait?: string }>;

  const lineRows = lines.map((line, idx) => {
    return el('div', { class: 'line-row' },
      el('select', { onChange: (e: Event) => { line.speaker = (e.target as HTMLSelectElement).value; dirty.dialog = true; } },
        ...SPEAKERS.map((sp) => {
          const o = el('option', { value: sp }, sp) as HTMLOptionElement;
          if (sp === line.speaker) o.selected = true;
          return o;
        })
      ),
      el('textarea', {
        value: line.text,
        onInput: (e: Event) => { line.text = (e.target as HTMLTextAreaElement).value; dirty.dialog = true; },
      }),
      el('input', {
        type: 'text', placeholder: 'portrait', value: line.portrait ?? '',
        onInput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          if (v) line.portrait = v; else delete line.portrait;
          dirty.dialog = true;
        },
      }),
      el('div', { class: 'actions' },
        el('button', { class: 'secondary', disabled: idx === 0,
          onClick: () => { [lines[idx - 1], lines[idx]] = [lines[idx]!, lines[idx - 1]!]; dirty.dialog = true; render(); }
        }, '↑'),
        el('button', { class: 'secondary', disabled: idx === lines.length - 1,
          onClick: () => { [lines[idx + 1], lines[idx]] = [lines[idx]!, lines[idx + 1]!]; dirty.dialog = true; render(); }
        }, '↓'),
        el('button', { class: 'danger',
          onClick: () => {
            if (!confirm(`${idx + 1}번 대사 삭제?`)) return;
            lines.splice(idx, 1); dirty.dialog = true; render();
          },
        }, '✕')
      )
    );
  });

  return el('div', { class: 'cms-content' },
    el('div', { class: 'hint' },
      el('strong', {}, '💡 다이얼로그: '),
      'speaker = narrator/mentor/owner/player. portrait 은 캐릭터 변형 키 (smirk/worried). 저장 후 게임 새로고침.'
    ),
    renderIdRow(spec.id, 'dialog.json'),
    el('div', { class: 'toolbar' },
      el('button', { class: 'secondary', onClick: () => { lines.push({ speaker: 'mentor', text: '' }); dirty.dialog = true; render(); } }, '+ 대사 추가'),
      el('button', { class: dirty.dialog ? 'success' : 'secondary', onClick: save }, dirty.dialog ? '💾 저장 (변경됨)' : '💾 저장'),
      el('span', { style: 'flex: 1;' }),
      el('span', { style: 'color: var(--text-dim); font-size: 12px;' }, `${lines.length}줄`)
    ),
    ...lineRows
  );
}

function renderEntityContent(): HTMLElement {
  const spec = TABS[currentTab];
  if (!activeKey) return el('div', { class: 'cms-content' }, el('div', { class: 'empty' }, '항목 선택'));
  const entry = spec.data[activeKey];

  const fields = spec.fields.map((f) => renderField(entry, f));

  const hintText = currentTab === 'modifiers'
    ? '효과 종류를 고르면 그 효과가 무엇을 하는지 설명이 나옵니다. 아래 파라미터를 바꾸면 예상되는 동작이 녹색 박스에 한글로 표시됩니다. 저장 후 게임 새로고침.'
    : currentTab === 'skills'
    ? '효과 종류를 고르면 그 스킬이 무엇을 하는지 설명이 나옵니다. 이름/설명/쿨다운/비용은 자유 편집. 저장 후 게임 새로고침.'
    : currentTab === 'archetypes'
    ? '페이즈별 가중치는 그 시간대에 등장할 확률 비율. 0=등장 안 함. 저장 후 게임 새로고침.'
    : '값을 바꾸고 저장하면 data/*.json 에 직접 기록. 저장 후 게임 새로고침.';
  return el('div', { class: 'cms-content' },
    el('div', { class: 'hint' },
      el('strong', {}, `💡 ${spec.label}: `),
      hintText
    ),
    renderIdRow(spec.id, spec.file),
    el('div', { class: 'toolbar' },
      el('button', { class: dirty[currentTab] ? 'success' : 'secondary', onClick: save },
        dirty[currentTab] ? '💾 저장 (변경됨)' : '💾 저장'),
      el('span', { style: 'flex: 1;' })
    ),
    ...fields
  );
}

function renderField(entry: any, f: FieldSpec): HTMLElement {
  const value = entry[f.key];
  const labelEl = el('label', { style: 'display:block; color: var(--text-dim); font-size: 12px; margin-top: 12px; margin-bottom: 4px;' }, f.label);

  let input: HTMLElement;
  switch (f.type) {
    case 'text':
      input = el('input', { type: 'text', value: value ?? '', style: fieldStyle(),
        onInput: (e: Event) => { entry[f.key] = (e.target as HTMLInputElement).value; dirty[currentTab] = true; },
      });
      break;
    case 'textarea':
      input = el('textarea', { value: value ?? '', style: fieldStyle() + 'min-height: 60px;',
        onInput: (e: Event) => { entry[f.key] = (e.target as HTMLTextAreaElement).value; dirty[currentTab] = true; },
      });
      break;
    case 'number':
      input = el('input', { type: 'number', value: value ?? 0, step: 'any', style: fieldStyle(),
        onInput: (e: Event) => { entry[f.key] = parseFloat((e.target as HTMLInputElement).value); dirty[currentTab] = true; },
      });
      break;
    case 'select': {
      const select = el('select', { style: fieldStyle(),
        onChange: (e: Event) => { entry[f.key] = (e.target as HTMLSelectElement).value; dirty[currentTab] = true; },
      });
      for (const opt of f.options ?? []) {
        const o = el('option', { value: opt }, opt) as HTMLOptionElement;
        if (opt === value) o.selected = true;
        select.append(o);
      }
      input = select;
      break;
    }
    case 'color': {
      const wrap = el('div', { style: 'display: flex; gap: 8px; align-items: center;' });
      const picker = el('input', { type: 'color', value: value ?? '#888888',
        onInput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          entry[f.key] = v;
          textIn.value = v;
          dirty[currentTab] = true;
        },
      });
      const textIn = el('input', { type: 'text', value: value ?? '#888888', style: fieldStyle() + 'max-width: 160px;',
        onInput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          entry[f.key] = v;
          if (/^#[0-9a-f]{6}$/i.test(v)) (picker as HTMLInputElement).value = v;
          dirty[currentTab] = true;
        },
      }) as HTMLInputElement;
      wrap.append(picker, textIn);
      input = wrap;
      break;
    }
    case 'json':
      input = el('textarea', {
        value: JSON.stringify(value ?? {}, null, 2),
        style: fieldStyle() + 'min-height: 100px; font-family: monospace; font-size: 12px;',
        placeholder: f.placeholder ?? '',
        onInput: (e: Event) => {
          try {
            entry[f.key] = JSON.parse((e.target as HTMLTextAreaElement).value);
            (e.target as HTMLElement).style.borderColor = 'var(--border)';
            dirty[currentTab] = true;
          } catch {
            (e.target as HTMLElement).style.borderColor = 'var(--danger)';
          }
        },
      });
      break;
    case 'phase-weights': {
      // 5개 페이즈 가중치 — 숫자 입력 5개. 0=등장 안 함, 값 크면 자주.
      const wrap = el('div', { style: 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 600px;' });
      const phases = ['morning', 'work', 'lunch', 'evening', 'night'];
      const obj: Record<string, number> = (value ?? {}) as Record<string, number>;
      for (const ph of phases) {
        const cell = el('div', { style: 'display: flex; flex-direction: column; gap: 4px;' });
        cell.append(
          el('span', { style: 'color: var(--text-dim); font-size: 11px; text-align: center;' }, PHASE_KO[ph] ?? ph),
          el('input', {
            type: 'number', step: '1', min: '0',
            value: obj[ph] ?? 0,
            style: fieldStyle(),
            onInput: (e: Event) => {
              const v = parseFloat((e.target as HTMLInputElement).value);
              if (!Number.isFinite(v) || v <= 0) delete obj[ph];
              else obj[ph] = v;
              entry[f.key] = obj;
              dirty[currentTab] = true;
            },
          }),
        );
        wrap.append(cell);
      }
      const hint = el('div', { style: 'color: var(--text-dim); font-size: 11px; margin-top: 6px;' },
        '값이 클수록 그 페이즈에 더 자주 등장. 0이거나 비우면 등장 안 함.');
      input = el('div', {}, wrap, hint);
      break;
    }
    case 'effect-id': {
      // effectId 선택 + 한글 이름/설명 표시. 변경 시 params 도 기본값으로 리셋.
      const meta = f.effectKind === 'modifier' ? MODIFIER_EFFECTS_META : SKILL_EFFECTS_META as any;
      const ids = Object.keys(meta);
      const select = el('select', { style: fieldStyle(),
        onChange: (e: Event) => {
          const newId = (e.target as HTMLSelectElement).value;
          entry[f.key] = newId;
          // 모디파이어인 경우 params 도 기본값으로 갈아끼움 (혼란 방지)
          if (f.effectKind === 'modifier') {
            const newMeta = MODIFIER_EFFECTS_META[newId];
            if (newMeta) {
              const defaults: Record<string, unknown> = {};
              for (const p of newMeta.params) defaults[p.key] = p.default ?? 1;
              entry.params = defaults;
            }
          }
          dirty[currentTab] = true;
          render();
        },
      });
      for (const id of ids) {
        const m = meta[id];
        const o = el('option', { value: id }, `${id} — ${m.name}`) as HTMLOptionElement;
        if (id === value) o.selected = true;
        select.append(o);
      }
      const currentMeta = meta[value];
      const descBox = currentMeta
        ? el('div', { style: 'margin-top: 6px; padding: 8px 12px; background: var(--row); border-left: 3px solid var(--accent); border-radius: 4px; font-size: 12px; color: var(--text);' },
            el('div', { style: 'font-weight: bold; color: var(--accent); margin-bottom: 2px;' }, currentMeta.name),
            el('div', { style: 'color: var(--text-dim);' }, currentMeta.desc))
        : el('div');
      input = el('div', {}, select, descBox);
      break;
    }
    case 'effect-params': {
      // 현재 effectId 에 따라 동적 폼. params 객체를 직접 mutate.
      const effectId = entry.effectId as string;
      const meta = MODIFIER_EFFECTS_META[effectId];
      if (!meta) {
        input = el('div', { style: 'color: var(--text-dim); font-size: 12px;' }, '효과 종류를 먼저 선택');
        break;
      }
      if (meta.params.length === 0) {
        input = el('div', { style: 'color: var(--text-dim); font-size: 12px; padding: 8px; background: var(--row); border-radius: 4px;' },
          '이 효과는 파라미터가 없음');
        break;
      }
      const params: Record<string, unknown> = (entry.params ?? {}) as Record<string, unknown>;
      // 누락된 키 기본값 보강
      for (const p of meta.params) if (params[p.key] === undefined) params[p.key] = p.default;
      entry.params = params;

      const grid = el('div', { style: 'display: grid; gap: 12px; max-width: 600px; padding: 12px; background: var(--row); border: 1px solid var(--border); border-radius: 4px;' });

      const previewBox = el('div', {
        style: 'margin-top: 10px; padding: 10px 14px; background: rgba(126, 217, 87, 0.1); border: 1px solid var(--success); border-radius: 4px; color: var(--success); font-size: 13px;',
      });
      const updatePreview = () => {
        previewBox.innerHTML = '';
        previewBox.append(
          el('span', { style: 'opacity: 0.7; margin-right: 6px;' }, '↪ 예상 효과:'),
          document.createTextNode(meta.preview(params)),
        );
      };

      for (const p of meta.params) {
        const row = el('div', { style: 'display: grid; grid-template-columns: 1fr 220px; gap: 8px; align-items: start;' });
        row.append(
          el('div', {},
            el('div', { style: 'color: var(--text); font-size: 13px;' }, p.label),
            p.hint ? el('div', { style: 'color: var(--text-dim); font-size: 11px; margin-top: 2px;' }, p.hint) : el('span'),
          ),
        );
        let widget: HTMLElement;
        if (p.type === 'select') {
          const sel = el('select', { style: fieldStyle(),
            onChange: (e: Event) => { params[p.key] = (e.target as HTMLSelectElement).value; dirty[currentTab] = true; updatePreview(); },
          });
          for (const opt of p.options ?? []) {
            const label = PHASE_KO[opt] ? `${opt} (${PHASE_KO[opt]})` : opt;
            const o = el('option', { value: opt }, label) as HTMLOptionElement;
            if (opt === params[p.key]) o.selected = true;
            sel.append(o);
          }
          widget = sel;
        } else if (p.type === 'number') {
          widget = el('input', { type: 'number', step: 'any', value: (params[p.key] as number) ?? p.default ?? 0,
            style: fieldStyle(),
            onInput: (e: Event) => { params[p.key] = parseFloat((e.target as HTMLInputElement).value); dirty[currentTab] = true; updatePreview(); },
          });
        } else {
          widget = el('input', { type: 'text', value: (params[p.key] as string) ?? '',
            style: fieldStyle(),
            onInput: (e: Event) => { params[p.key] = (e.target as HTMLInputElement).value; dirty[currentTab] = true; updatePreview(); },
          });
        }
        row.append(widget);
        grid.append(row);
      }

      input = el('div', {}, grid, previewBox);
      updatePreview();
      break;
    }
  }
  return el('div', {}, labelEl, input);
}

function fieldStyle(): string {
  return 'width: 100%; max-width: 480px; padding: 6px 10px; background: var(--row); color: var(--text); border: 1px solid var(--border); border-radius: 4px; font-family: inherit; font-size: 13px;';
}

function renderIdRow(_tab: Tab, file: string): HTMLElement {
  return el('div', { class: 'script-id-row' },
    el('label', {}, 'ID:'),
    el('input', {
      type: 'text', value: activeKey ?? '',
      onChange: (e: Event) => {
        const newId = (e.target as HTMLInputElement).value.trim();
        if (!newId || newId === activeKey) return;
        const data = TABS[currentTab].data;
        if (data[newId]) { alert('이미 존재하는 ID'); render(); return; }
        data[newId] = data[activeKey!];
        delete data[activeKey!];
        activeKey = newId;
        dirty[currentTab] = true;
        render();
      },
    }),
    el('span', { style: 'color: var(--text-dim); font-size: 11px;' }, `→ data/${file}`),
    el('button', {
      class: 'danger',
      onClick: () => {
        if (!confirm(`"${activeKey}" 삭제?`)) return;
        delete TABS[currentTab].data[activeKey!];
        const keys = Object.keys(TABS[currentTab].data);
        activeKey = keys[0] ?? null;
        dirty[currentTab] = true;
        render();
      },
    }, '삭제')
  );
}

function renderShortcutBar(): HTMLElement {
  return el('div', {
    style: 'padding: 6px 16px; background: #0e0e14; border-top: 1px solid var(--border); color: var(--text-dim); font-size: 11px; display: flex; gap: 16px; justify-content: center;',
  },
    el('span', {}, '⌘S 저장'),
    el('span', {}, '⌘D 복제'),
    el('span', {}, '⌘N 새 항목'),
    el('span', {}, '⌘1–5 탭'),
    el('span', {}, '/ 검색'),
    el('span', {}, 'Esc 검색지우기'),
  );
}

function render(): void {
  root.innerHTML = '';
  const content = currentTab === 'dialog' ? renderDialogContent() : renderEntityContent();
  root.append(
    renderHeader(),
    renderTabs(),
    el('div', { class: 'cms-main' },
      renderSidebar(),
      content
    ),
    renderShortcutBar(),
  );
}

render();

window.addEventListener('beforeunload', (e) => {
  if (Object.values(dirty).some((d) => d)) { e.preventDefault(); e.returnValue = ''; }
});

// ─── 키보드 단축키 ────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement | null;
  const inEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
  const meta = e.metaKey || e.ctrlKey;

  // Cmd/Ctrl+S — 저장
  if (meta && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (dirty[currentTab]) save();
    else toast('변경 없음');
    return;
  }
  // Cmd/Ctrl+D — 활성 entry 복제
  if (meta && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    if (activeKey) duplicateEntry(activeKey);
    return;
  }
  // Cmd/Ctrl+N — 새 entry
  if (meta && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    createNewEntry();
    return;
  }
  // Cmd/Ctrl+1..5 — 탭 전환
  if (meta && /^[1-5]$/.test(e.key)) {
    e.preventDefault();
    const tabIds = (Object.keys(TABS) as Tab[]);
    const idx = parseInt(e.key, 10) - 1;
    if (tabIds[idx]) { currentTab = tabIds[idx]; resetActiveKey(); render(); }
    return;
  }
  // / — sidebar 검색 포커스 (editable 안 일 때만)
  if (!inEditable && e.key === '/') {
    const input = document.getElementById('cms-search') as HTMLInputElement | null;
    if (input) { e.preventDefault(); input.focus(); input.select(); }
    return;
  }
  // Escape — 검색 비우기
  if (e.key === 'Escape') {
    const input = document.getElementById('cms-search') as HTMLInputElement | null;
    if (input && document.activeElement === input) {
      e.preventDefault();
      searchByTab[currentTab] = '';
      render();
    }
  }
});
