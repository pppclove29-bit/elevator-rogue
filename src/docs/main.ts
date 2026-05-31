import { TICK_MS } from '../config';
import {
  PHASES,
  PHASE_LABEL,
  PHASE_SPAWN_INTERVAL,
  PHASE_TICKS,
  PHASE_TRAFFIC,
  dayLengthTicks,
} from '../domain/phase';
import { ARCHETYPES } from '../domain/archetypes';
import { EVENTS, EVENT_CONFIG } from '../meta/events';
import { MODIFIERS } from '../meta/modifiers';
import { RELICS } from '../meta/relics';
import { ROLE_COLOR, ROLE_SHORT } from '../domain/spawner';
import { defaultParams } from '../domain/simulation';
import { defaultPolicy, FloorRole } from '../domain/types';
import { THEMES } from '../meta/themes';
import { SKILLS, MAX_SKILLS } from '../meta/skills';
import { UPGRADES, MAX_ELEVATORS } from '../meta/upgrades';

const root = document.getElementById('root')!;
root.innerHTML = '';

const tickSec = (n: number) => `${((n * TICK_MS) / 1000).toFixed(1)}s`;
const roleHex = (r: FloorRole) => '#' + ROLE_COLOR[r].toString(16).padStart(6, '0');

function el(tag: string, props: Record<string, any> = {}, ...children: (Node | string)[]): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v as string;
    else if (k === 'html') e.innerHTML = v as string;
    else if (k.startsWith('data-')) e.setAttribute(k, v as string);
    else (e as any)[k] = v;
  }
  for (const c of children) e.append(c);
  return e;
}

// Header
root.append(
  el('div', { class: 'dash-header' },
    el('h1', {}, 'Elevator Rogue — Dashboard'),
    el('div', { class: 'subtitle' },
      '코드 진실원천 · ',
      el('a', { href: '/' }, '게임'), ' · ',
      el('a', { href: '/design.html' }, '레벨 디자인 카탈로그')
    )
  ),
  el('div', { class: 'dash-nav' },
    ...[
      ['#sim-params', '시뮬 파라미터'],
      ['#phases', '페이즈'],
      ['#roles', '층 역할'],
      ['#policy', '운영 정책'],
      ['#themes', '빌딩 테마'],
      ['#upgrades', '업그레이드'],
      ['#skills', '즉발 스킬'],
      ['#archetypes', '승객 아키타입'],
      ['#modifiers', 'Daily Modifiers'],
      ['#relics', 'Relics'],
      ['#events', 'Random Events'],
    ].map(([h, t]) => el('a', { href: h }, t))
  )
);

// SimParams
{
  const p = defaultParams();
  const section = el('section', { id: 'sim-params' });
  section.append(
    el('h2', {}, '시뮬레이션 파라미터'),
    el('p', { class: 'section-desc' }, `TICK_MS = ${TICK_MS}ms (${1000 / TICK_MS}Hz). 업그레이드/모디파이어로 변경되는 베이스 값.`),
    el('div', { class: 'kvs', html: `
      <dt>기본 정차</dt><dd>${p.baseLoadTicks} tick (${tickSec(p.baseLoadTicks)})</dd>
      <dt>1인당 추가 정차</dt><dd>+${p.perPassengerLoadTicks} tick/명</dd>
      <dt>층 큐 상한</dt><dd>${p.floorCapacity}명 (초과 시 anger ×${p.angerFloorFullMultiplier})</dd>
      <dt>대기 anger</dt><dd>${p.angerWaitingPerTick}/tick</dd>
      <dt>탑승 anger</dt><dd>${p.angerRidingPerTick}/tick</dd>
      <dt>엘베 최대</dt><dd>${MAX_ELEVATORS}</dd>
      <dt>스킬 슬롯</dt><dd>${MAX_SKILLS}칸</dd>
    ` })
  );
  root.append(section);
}

// Phases
{
  const section = el('section', { id: 'phases' });
  const dayLen = dayLengthTicks();
  section.append(
    el('h2', {}, '하루 페이즈'),
    el('p', { class: 'section-desc' }, `하루 = ${dayLen} tick (${tickSec(dayLen)} @ 1×)`)
  );
  const table = el('table');
  table.innerHTML = `<thead><tr>
    <th>페이즈</th><th>길이</th><th>스폰 간격</th><th>Origin</th><th>Dest</th>
  </tr></thead>`;
  const tbody = el('tbody');
  for (const ph of PHASES) {
    const t = PHASE_TRAFFIC[ph];
    const fmt = (w: Partial<Record<FloorRole, number>>) =>
      Object.entries(w).map(([r, v]) => `<span class="role-chip" style="background:${roleHex(r as FloorRole)}">${ROLE_SHORT[r as FloorRole]} ${v}</span>`).join('');
    const tr = el('tr');
    tr.innerHTML = `
      <td><span class="phase-pill">${PHASE_LABEL[ph]}</span></td>
      <td>${PHASE_TICKS[ph]} tick (${tickSec(PHASE_TICKS[ph])})</td>
      <td>${PHASE_SPAWN_INTERVAL[ph]} tick</td>
      <td>${fmt(t.origin)}</td>
      <td>${fmt(t.dest)}</td>`;
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  root.append(section);
}

// Roles
{
  const section = el('section', { id: 'roles' });
  section.append(el('h2', {}, '층 역할'),
    el('p', { class: 'section-desc' }, '1F=lobby, 마지막=rooftop, 가운데=restaurant, 나머지=office.'));
  const grid = el('div', { class: 'grid' });
  for (const r of ['lobby', 'office', 'restaurant', 'rooftop', 'basement'] as FloorRole[]) {
    grid.append(el('div', { class: 'card', html: `
      <div class="card-tag"><span class="role-chip" style="background:${roleHex(r)}">${ROLE_SHORT[r]}</span> ${r}</div>
      <div class="card-name">${r.toUpperCase()}</div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Elevator Policy
{
  const p = defaultPolicy();
  const section = el('section', { id: 'policy' });
  section.append(
    el('h2', {}, '엘리베이터 운영 정책 (기본값 v2)'),
    el('p', { class: 'section-desc', html: '엘베마다 4가지 다중 선택 필드. 빈 배열 = 제약 없음.' }),
    el('div', { class: 'kvs', html: `
      <dt>멈출 층</dt><dd>${p.stopFloors.length === 0 ? '전층' : p.stopFloors.map((f) => `${f + 1}F`).join(', ')}</dd>
      <dt>태울 승객</dt><dd>${p.pickupArchetypes.length === 0 ? '모든 종류' : p.pickupArchetypes.join(', ')}</dd>
      <dt>승차 전용 층</dt><dd>${p.pickupOnlyFloors.length === 0 ? '제한 없음' : p.pickupOnlyFloors.map((f) => `${f + 1}F`).join(', ')}</dd>
      <dt>하차 전용 층</dt><dd>${p.dropoffOnlyFloors.length === 0 ? '제한 없음' : p.dropoffOnlyFloors.map((f) => `${f + 1}F`).join(', ')}</dd>
    ` })
  );
  root.append(section);
}

// Themes
{
  const themes = Object.values(THEMES);
  const section = el('section', { id: 'themes' });
  section.append(
    el('h2', {}, `빌딩 테마 (${themes.length})`),
    el('p', { class: 'section-desc' }, '타이틀에서 선택. 시작 골드 보너스 + 빌딩 구성/스폰 가중치 변경.')
  );
  const grid = el('div', { class: 'grid' });
  for (const t of themes) {
    grid.append(el('div', { class: 'card', html: `
      <div class="card-tag">THEME · <span class="mono">${t.id}</span></div>
      <div class="card-name">${t.name}</div>
      <div class="card-desc">${t.flavor}</div>
      <div class="card-meta">${t.desc}${t.startingGoldBonus ? `<br>시작 보너스 +${t.startingGoldBonus}G` : ''}</div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Upgrades
{
  const section = el('section', { id: 'upgrades' });
  section.append(
    el('h2', {}, `업그레이드 카드 (${Object.keys(UPGRADES).length})`),
    el('p', { class: 'section-desc' }, '하루 종료 보상 70% 가중 (Step 9에서 골드 상점으로 이관 예정).')
  );
  const grid = el('div', { class: 'grid' });
  for (const u of Object.values(UPGRADES)) {
    grid.append(el('div', { class: 'card upgrade', html: `
      <div class="card-tag">UPG · <span class="mono">${u.id}</span></div>
      <div class="card-name">${u.name}</div>
      <div class="card-desc">${u.desc}</div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Skills
{
  const section = el('section', { id: 'skills' });
  section.append(
    el('h2', {}, `즉발 스킬 (${Object.keys(SKILLS).length})`),
    el('p', { class: 'section-desc' }, 'HUD Q/W/E. 보상 30% 가중, 최대 3개 보유.')
  );
  const grid = el('div', { class: 'grid' });
  for (const s of Object.values(SKILLS)) {
    grid.append(el('div', { class: 'card skill', html: `
      <div class="card-tag">SKILL · <span class="mono">${s.id}</span></div>
      <div class="card-name">${s.name}</div>
      <div class="card-desc">${s.desc}</div>
      <div class="card-meta">쿨다운 ${s.cooldownTicks} tick (${tickSec(s.cooldownTicks)})</div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Archetypes
{
  const section = el('section', { id: 'archetypes' });
  const archs = Object.values(ARCHETYPES);
  section.append(
    el('h2', {}, `승객 아키타입 (${archs.length})`),
    el('p', { class: 'section-desc' }, '스폰 시 페이즈 가중치로 랜덤 선택. 색·정원·골드·anger 가중치 다름.')
  );
  const grid = el('div', { class: 'grid' });
  for (const a of archs) {
    const colorHex = '#' + a.color.toString(16).padStart(6, '0');
    grid.append(el('div', { class: 'card', html: `
      <div class="card-tag"><span style="color:${colorHex}">●</span> <span class="mono">${a.id}</span></div>
      <div class="card-name">${a.name}</div>
      <div class="card-desc">${a.desc}</div>
      <div class="card-meta">
        Gold ×${a.goldMultiplier} · Anger ×${a.angerMultiplier} · Space ${a.spaceCost} · Load+${a.loadTickBonus}${a.fastBonus > 1 ? ` · Fast bonus ×${a.fastBonus}` : ''}${a.groupSize > 1 ? ` · Group ${a.groupSize}` : ''}
      </div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Modifiers
{
  const section = el('section', { id: 'modifiers' });
  const mods = Object.values(MODIFIERS);
  const by = { debuff: 0, buff: 0, mixed: 0 };
  for (const m of mods) (by as any)[m.type] += 1;
  section.append(
    el('h2', {}, `Daily Modifiers (${mods.length})`),
    el('p', { class: 'section-desc' }, `매 3일마다 1택 강제. 디버프 ${by.debuff} · 버프 ${by.buff} · 혼합 ${by.mixed}. 하루 한정 (다음 day 시작 시 만료).`)
  );
  const grid = el('div', { class: 'grid' });
  for (const m of mods) {
    const cls = m.type === 'debuff' ? 'debuff' : m.type === 'buff' ? 'buff' : 'mixed';
    grid.append(el('div', { class: 'card ' + cls, html: `
      <div class="card-tag">${m.type.toUpperCase()} · <span class="mono">${m.id}</span></div>
      <div class="card-name">${m.name}</div>
      <div class="card-desc">${m.desc}</div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Relics
{
  const section = el('section', { id: 'relics' });
  const relics = Object.values(RELICS);
  const by = { pure: 0, tradeoff: 0, curse: 0 };
  for (const r of relics) (by as any)[r.type] += 1;
  section.append(
    el('h2', {}, `Relics (${relics.length})`),
    el('p', { class: 'section-desc' }, `매 5일마다 3장 1택 (SKIP 가능). 런 종료까지 영구. 순수 ${by.pure} · 트레이드오프 ${by.tradeoff} · 디버프 ${by.curse}.`)
  );
  const grid = el('div', { class: 'grid' });
  for (const r of relics) {
    grid.append(el('div', { class: 'card relic', html: `
      <div class="card-tag">${r.type.toUpperCase()} · <span class="mono">${r.id}</span></div>
      <div class="card-name">${r.name}</div>
      <div class="card-desc">${r.desc}</div>` }));
  }
  section.append(grid);
  root.append(section);
}

// Events
{
  const section = el('section', { id: 'events' });
  const events = Object.values(EVENTS);
  section.append(
    el('h2', {}, `Random Events (${events.length})`),
    el('p', { class: 'section-desc' }, `Day ${EVENT_CONFIG.startDay}부터 매일 시작 시 ${EVENT_CONFIG.chancePerDay * 100}% 확률로 1개 발동. 일부는 지속형(만료 시 자동 cleanup), 일부는 즉시 효과.`)
  );
  const table = el('table', { class: 'compact-table' });
  table.innerHTML = `<thead><tr><th>ID</th><th>이름</th><th>설명</th><th>심각도</th></tr></thead>`;
  const tbody = el('tbody');
  for (const e of events) {
    const sevColor = e.severity === 'critical' ? '#e74c3c' : e.severity === 'major' ? '#f5c542' : '#7ed957';
    const tr = el('tr');
    tr.innerHTML = `
      <td><span class="mono">${e.id}</span></td>
      <td><strong>${e.name}</strong></td>
      <td>${e.desc}</td>
      <td><span style="color:${sevColor}">${e.severity.toUpperCase()}</span></td>`;
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  root.append(section);
}

root.append(el('div', { class: 'callout', html: `
  운영은 <strong>정책 form</strong> (엘베별 4가지 설정). 보상 = <strong>골드 상점</strong>(매일) + <strong>Modifier 모달</strong>(매 3일) + <strong>Relic 모달</strong>(매 5일). 매 4일 층 +1. Day ${EVENT_CONFIG.startDay}부터 매일 ${EVENT_CONFIG.chancePerDay * 100}% 확률로 Random Event. 공휴일/보스 day는 고정 발생.
` }));
