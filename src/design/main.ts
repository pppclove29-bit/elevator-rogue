import { TERMS } from '../i18n/terms';
import {
  CUSTOMERS, EVENTS, FLOOR_ROLES_DESIGN, MODIFIERS, Status,
  UPGRADES_DESIGN, WEEK_DESIGN,
} from './catalogs';

const root = document.getElementById('root')!;
root.innerHTML = '';

function el(tag: string, props: Record<string, any> = {}, ...children: (Node | string)[]): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else (e as any)[k] = v;
  }
  for (const c of children) e.append(c);
  return e;
}

const STATUS_LABEL: Record<Status, string> = {
  done: '구현됨',
  partial: '부분 구현',
  todo: '예정',
  idea: '안 (검토 중)',
};

function statusBadge(s: Status): string {
  return `<span class="status-badge ${s}">${STATUS_LABEL[s]}</span>`;
}

function countByStatus<T extends { status: Status }>(arr: T[]): Record<Status, number> {
  const out: Record<Status, number> = { done: 0, partial: 0, todo: 0, idea: 0 };
  for (const a of arr) out[a.status] += 1;
  return out;
}

function statusSummary(arr: { status: Status }[]): string {
  const c = countByStatus(arr);
  const parts: string[] = [];
  if (c.done) parts.push(`<span class="status-badge done">${c.done}</span>`);
  if (c.partial) parts.push(`<span class="status-badge partial">${c.partial}</span>`);
  if (c.todo) parts.push(`<span class="status-badge todo">${c.todo}</span>`);
  if (c.idea) parts.push(`<span class="status-badge idea">${c.idea}</span>`);
  return parts.join(' ');
}

// ──────────── Header ────────────
root.append(
  el('div', { class: 'dash-header' },
    el('h1', {}, 'Elevator Rogue — Level Design Catalog'),
    el('div', { class: 'subtitle' }, '기획자용 카탈로그 · ',
      el('a', { href: '/' }, '게임'), ' · ',
      el('a', { href: '/docs.html' }, '코드 진실원천 대시보드'))
  ),
);

// ──────────── TOC ────────────
root.append(el('div', { class: 'toc', html: `
  <h3>섹션</h3>
  <ol>
    <li><a href="#glossary">용어집</a></li>
    <li><a href="#modifiers">Daily Modifier (${MODIFIERS.length})</a></li>
    <li><a href="#upgrades">엘베 업그레이드 (${UPGRADES_DESIGN.length})</a></li>
    <li><a href="#floors">층 디자인 (${FLOOR_ROLES_DESIGN.length})</a></li>
    <li><a href="#customers">고객 디자인 (${CUSTOMERS.length})</a></li>
    <li><a href="#events">랜덤 이벤트 (${EVENTS.length})</a></li>
    <li><a href="#week">요일 개념 검토</a></li>
  </ol>
` }));

// ──────────── 0. Glossary ────────────
{
  const section = el('section', { id: 'glossary' });
  section.append(
    el('h2', {}, '용어집'),
    el('p', { class: 'section-desc', html: '코드 내부 식별자와 UI에 노출되는 한국어 라벨 매핑. <span class="mono">src/i18n/terms.ts</span>가 단일 진실원천.' })
  );

  // 카테고리별 그룹화
  const groups: Array<{ title: string; keys: Array<keyof typeof TERMS> }> = [
    { title: '자원·자원 단위', keys: ['gold', 'goldShort', 'capacity', 'speed', 'loadTime'] },
    { title: '승객·상태',     keys: ['passenger', 'passengerWaiting', 'passengerOnboard', 'anger', 'angerThreshold', 'served', 'servedAngry', 'floorFull'] },
    { title: '엘리베이터',    keys: ['elevator', 'elevatorShort', 'broken', 'repair'] },
    { title: '시간·페이즈',   keys: ['day', 'phase', 'morning', 'work', 'lunch', 'evening', 'night'] },
    { title: '메타',          keys: ['modifier', 'relic', 'skill', 'upgrade', 'event'] },
    { title: '상점·UI',       keys: ['shop', 'buy', 'reroll', 'notEnoughGold', 'full', 'resume', 'pause', 'restart', 'skip', 'take'] },
    { title: '운영 정책',     keys: ['policy', 'floorRange', 'parity', 'pickupMode', 'unloadWhenFull', 'parityAll', 'parityEven', 'parityOdd', 'pickupAny', 'pickupLobbyOnly', 'pickupRole'] },
  ];

  for (const g of groups) {
    section.append(el('h3', {}, g.title));
    const table = el('table', { class: 'compact-table' });
    table.innerHTML = `<thead><tr><th style="width:40%">코드 식별자</th><th>UI 라벨</th></tr></thead>`;
    const tbody = el('tbody');
    for (const k of g.keys) {
      const tr = el('tr');
      tr.innerHTML = `<td><span class="mono">${String(k)}</span></td><td>${TERMS[k]}</td>`;
      tbody.append(tr);
    }
    table.append(tbody);
    section.append(table);
  }

  section.append(el('div', { class: 'callout', html: `
    <strong>변환 헬퍼</strong>:
    <span class="mono">tickToSec(ticks)</span> — 14 tick → "0.7초",
    <span class="mono">gold(n)</span> — 30 → "30G",
    <span class="mono">percentDelta(mul)</span> — 0.85 → "-15%", 1.2 → "+20%"
  ` }));
  root.append(section);
}

// ──────────── 1. Modifiers ────────────
{
  const section = el('section', { id: 'modifiers' });
  section.append(
    el('h2', { html: `1. Daily Modifier <span class="note">— ${statusSummary(MODIFIERS)}</span>` }),
    el('p', { class: 'section-desc', html: '하루 한정. 트리거: <strong>매 3일</strong> 모달, 3장 강제 1택 (완전 랜덤). 디버프 11 · 버프 6 · 혼합 3. 모디파이어 시스템은 Step 7에서 구현 예정.' })
  );

  for (const type of ['debuff', 'buff', 'mixed'] as const) {
    const subset = MODIFIERS.filter((m) => m.type === type);
    const label = { debuff: '디버프 (압박)', buff: '버프 (숨통)', mixed: '혼합 (trade-off)' }[type];
    section.append(el('h3', {}, label, ` (${subset.length})`));
    const grid = el('div', { class: 'grid' });
    for (const m of subset) {
      grid.append(el('div', { class: `card ${type}`, html: `
        <div class="card-tag">${m.id}${statusBadge(m.status)}</div>
        <div class="card-name">${m.name}</div>
        <div class="card-desc">${m.desc}</div>
        <div class="card-meta"><strong>EFFECT</strong><br><span class="mono">${m.effect}</span></div>
        ${m.notes ? `<div class="note" style="margin-top:6px">${m.notes}</div>` : ''}
      ` }));
    }
    section.append(grid);
  }
  root.append(section);
}

// ──────────── 2. Upgrades ────────────
{
  const section = el('section', { id: 'upgrades' });
  section.append(
    el('h2', { html: `2. 엘베 업그레이드 <span class="note">— ${statusSummary(UPGRADES_DESIGN)}</span>` }),
    el('p', { class: 'section-desc', html: 'Step 9의 골드 상점에서 구매. 현재(Step 6b)까지는 카드 보상 모달에서 무료 획득.' })
  );

  const table = el('table', { class: 'compact-table' });
  table.innerHTML = `
    <thead><tr>
      <th>ID</th><th>이름</th><th>카테고리</th><th>효과</th><th>가격(예상)</th><th>상태</th>
    </tr></thead>
  `;
  const tbody = el('tbody');
  for (const u of UPGRADES_DESIGN) {
    const tr = el('tr');
    tr.innerHTML = `
      <td><span class="mono">${u.id}</span></td>
      <td><strong>${u.name}</strong><div class="note">${u.desc}</div></td>
      <td><span class="tag">${u.category}</span></td>
      <td><span class="mono">${u.effect}</span></td>
      <td>${u.cost ?? '-'}</td>
      <td>${statusBadge(u.status)}</td>
    `;
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  root.append(section);
}

// ──────────── 3. Floor Roles ────────────
{
  const section = el('section', { id: 'floors' });
  section.append(
    el('h2', { html: `3. 층 디자인 <span class="note">— ${statusSummary(FLOOR_ROLES_DESIGN)}</span>` }),
    el('p', { class: 'section-desc', html: '역할별 골드 보상치 + 트래픽 노트. 빌딩 확장 시 풀에서 랜덤 배치 (Step 7 메타).' })
  );
  const table = el('table');
  table.innerHTML = `
    <thead><tr><th>ID</th><th>이름</th><th>설명</th><th>골드</th><th>트래픽</th><th>상태</th></tr></thead>
  `;
  const tbody = el('tbody');
  for (const f of FLOOR_ROLES_DESIGN) {
    const tr = el('tr');
    tr.innerHTML = `
      <td><span class="mono">${f.id}</span></td>
      <td><strong>${f.name}</strong></td>
      <td>${f.desc}</td>
      <td><strong>${f.goldOnArrive}G</strong></td>
      <td class="note">${f.trafficNote}</td>
      <td>${statusBadge(f.status)}${f.notes ? `<div class="note">${f.notes}</div>` : ''}</td>
    `;
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  root.append(section);
}

// ──────────── 4. Customers ────────────
{
  const section = el('section', { id: 'customers' });
  section.append(
    el('h2', { html: `4. 고객 디자인 <span class="note">— ${statusSummary(CUSTOMERS)}</span>` }),
    el('p', { class: 'section-desc', html: '승객 아키타입. 현재 일반 1종만 구현, 나머지는 Step 9 골드 시스템 + Step 10 다양성 단계에서 도입 검토.' })
  );
  const table = el('table');
  table.innerHTML = `
    <thead><tr><th>ID</th><th>이름</th><th>설명</th><th>골드 배수</th><th>Anger</th><th>스폰</th><th>상태</th></tr></thead>
  `;
  const tbody = el('tbody');
  for (const c of CUSTOMERS) {
    const tr = el('tr');
    tr.innerHTML = `
      <td><span class="mono">${c.id}</span></td>
      <td><strong>${c.name}</strong></td>
      <td>${c.desc}</td>
      <td><span class="mono">${c.goldMod}</span></td>
      <td>${c.angerMod}</td>
      <td class="note">${c.spawnRule}</td>
      <td>${statusBadge(c.status)}${c.notes ? `<div class="note">${c.notes}</div>` : ''}</td>
    `;
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  root.append(section);
}

// ──────────── 5. Events ────────────
{
  const section = el('section', { id: 'events' });
  section.append(
    el('h2', { html: `5. 랜덤 이벤트 <span class="note">— ${statusSummary(EVENTS)}</span>` }),
    el('p', { class: 'section-desc', html: '날짜 단위 발생. 모디파이어와 달리 일회성 강한 임팩트. 일부는 요일/계절 결합.' })
  );
  const table = el('table');
  table.innerHTML = `
    <thead><tr><th>ID</th><th>이름</th><th>트리거</th><th>효과</th><th>지속</th><th>심각도</th><th>상태</th></tr></thead>
  `;
  const tbody = el('tbody');
  for (const e of EVENTS) {
    const sevColor = e.severity === 'critical' ? '#e74c3c' : e.severity === 'major' ? '#f5c542' : '#7ed957';
    const tr = el('tr');
    tr.innerHTML = `
      <td><span class="mono">${e.id}</span></td>
      <td><strong>${e.name}</strong><div class="note">${e.desc}</div></td>
      <td class="note">${e.trigger}</td>
      <td><span class="mono">${e.effect}</span></td>
      <td>${e.duration}</td>
      <td><span style="color:${sevColor}">${e.severity.toUpperCase()}</span></td>
      <td>${statusBadge(e.status)}${e.notes ? `<div class="note">${e.notes}</div>` : ''}</td>
    `;
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  root.append(section);
}

// ──────────── 6. Week ────────────
{
  const section = el('section', { id: 'week' });
  section.append(
    el('h2', { html: `6. 요일 개념 <span class="status-badge idea">검토 중</span>` }),
    el('p', { class: 'section-desc', html: '현재 게임은 day 단위 무한 반복. <strong>일주일(7일) 사이클</strong>을 추가하면 (a) 평일/주말 트래픽 패턴 분화, (b) 특정 이벤트 요일 매핑, (c) 주간 마일스톤(주말 끝 = 큰 보상/리뷰), (d) 메타 진행감.' })
  );

  const grid = el('div', { class: 'day-grid' });
  for (const d of WEEK_DESIGN) {
    grid.append(el('div', { class: `day-cell ${d.weekend ? 'weekend' : ''}`, html: `
      <div class="day-name">${d.short}<br><span class="note">${d.name}</span></div>
      <div class="day-trait">${d.trait}</div>
    ` }));
  }
  section.append(grid);

  section.append(el('div', { class: 'callout', html: `
    <strong>제안 (도입 시 영향)</strong><br>
    • 한 런 = 한 달(4주)? 또는 무제한? — 게임 길이 결정<br>
    • 주말 = 단기 매출 ↑ 하지만 패턴 다름 → 운영 전략 전환 필요<br>
    • 일요일 종료 시 주간 정산(보너스/디버프) — 마일스톤 압박<br>
    • 요일 표시는 HUD에 day 옆 작게 (예: <span class="mono">Day 6 · Sat · LUNCH</span>)<br>
    • <strong>리스크</strong>: day 외에 요일까지 들어가면 인지 부담. UI 정보량 ↑. 첫 인상에서 복잡해 보일 수 있음<br>
    • <strong>대안</strong>: 요일 대신 "특별한 날" 태그 (3일째 = 화재 훈련일, 7일째 = VIP 데이) — 더 단순
  ` }));
  root.append(section);
}

// ──────────── Footer ────────────
root.append(el('div', { class: 'callout', html: `
  <strong>이 페이지의 역할</strong>: 디자인 검토용 카탈로그. 미구현 안 포함. 데이터 진실원천은 <span class="mono">src/design/catalogs.ts</span>.<br>
  코드의 실제 구현 상태는 <a href="/docs.html">/docs.html</a> 참고. 두 페이지는 의도적으로 분리.
` }));
