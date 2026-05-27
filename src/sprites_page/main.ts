import { SPRITE_KEYS, SpriteCategory, SpriteMeta } from '../render/sprites';

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

type LoadStatus = 'loaded' | 'missing';
const status: Record<string, LoadStatus> = {};

async function checkOne(meta: SpriteMeta): Promise<void> {
  try {
    const res = await fetch(`sprites/${meta.key}.png`, { method: 'HEAD' });
    status[meta.key] = res.ok ? 'loaded' : 'missing';
  } catch {
    status[meta.key] = 'missing';
  }
}

function stat(label: string, value: string): HTMLElement {
  return el('div', { class: 'stat' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, value));
}

const CATEGORY_ORDER: SpriteCategory[] = ['elevator', 'passenger', 'floor', 'environment', 'ui', 'decoration'];
const CATEGORY_LABEL: Record<SpriteCategory, string> = {
  elevator: '엘리베이터',
  passenger: '승객 (14 archetype)',
  floor: '층 역할 아이콘',
  environment: '환경 (입구/계단/시설)',
  ui: 'UI 아이콘 (HUD)',
  decoration: '데코 (배경/타이틀)',
};

function render(): void {
  root.innerHTML = '';

  root.append(
    el('div', { class: 'dash-header' },
      el('h1', {}, 'Elevator Rogue — Sprite Catalog'),
      el('div', { class: 'subtitle' }, '스프라이트 작업 레퍼런스 · ',
        el('a', { href: '/' }, '게임'), ' · ',
        el('a', { href: '/docs.html' }, '코드 대시보드'), ' · ',
        el('a', { href: '/design.html' }, '디자인 카탈로그'), ' · ',
        el('a', { href: '/sounds.html' }, '사운드 카탈로그'))
    ),
  );

  root.append(el('div', { class: 'callout', html: `
    <strong>이 페이지의 역할</strong>: 스프라이트 작업/구매 시 참고용 카탈로그.
    단일 진실원: <span class="mono">src/render/sprites.ts</span> 의 <span class="mono">SPRITE_KEYS</span>.<br>
    파일을 <span class="mono">public/sprites/&lt;key&gt;.png</span> 에 넣으면 게임이 자동 로드 (없으면 도형 fallback).
    <br><strong>스타일</strong>: 픽셀 아트 32~64px, 색 8~16 팔레트, 투명 배경.
  ` }));

  const total = SPRITE_KEYS.length;
  const loaded = SPRITE_KEYS.filter((s) => status[s.key] === 'loaded').length;
  const must = SPRITE_KEYS.filter((s) => s.priority === 'must');
  const mustLoaded = must.filter((s) => status[s.key] === 'loaded').length;

  const summary = el('div', { class: 'sprite-summary' });
  summary.append(stat('전체 키', `${loaded} / ${total}`));
  summary.append(stat('필수 (must)', `${mustLoaded} / ${must.length}`));
  summary.append(stat('진행률', `${total === 0 ? 0 : Math.round((loaded / total) * 100)}%`));
  root.append(summary);

  // 권장 소스 callout
  {
    const section = el('section');
    section.append(
      el('h2', {}, '권장 소스 (CC0 / CC-BY)'),
      el('ul', { html: `
        <li><a href="https://opengameart.org" target="_blank" rel="noopener">opengameart.org</a> — 게임용 픽셀 아트 풍부</li>
        <li><a href="https://itch.io/game-assets/free/tag-pixel-art" target="_blank" rel="noopener">itch.io free pixel art</a> — 인디 픽셀 아트 팩</li>
        <li><a href="https://kenney.nl/assets" target="_blank" rel="noopener">kenney.nl</a> — CC0 대량</li>
        <li><a href="https://craftpix.net/freebies/" target="_blank" rel="noopener">craftpix.net</a> — 무료 픽셀 셋</li>
        <li>본인 작업: <a href="https://www.aseprite.org/" target="_blank" rel="noopener">Aseprite</a> (유료, 인디 도구 표준) / <a href="https://www.piskelapp.com/" target="_blank" rel="noopener">Piskel</a> (무료)</li>
      ` }),
    );
    root.append(section);
  }

  // 카테고리별 테이블
  for (const cat of CATEGORY_ORDER) {
    const items = SPRITE_KEYS.filter((s) => s.category === cat);
    if (items.length === 0) continue;
    const section = el('section');
    section.append(el('h2', {}, CATEGORY_LABEL[cat], ` (${items.length})`));

    const header = el('div', { class: 'sprite-row header' });
    header.append(
      el('div', {}, '미리보기'),
      el('div', {}, 'KEY'),
      el('div', {}, '이름'),
      el('div', {}, '용도'),
      el('div', {}, '사이즈'),
      el('div', {}, 'Fallback'),
      el('div', {}, '상태'),
    );
    section.append(header);

    for (const meta of items) {
      const row = el('div', { class: 'sprite-row' });
      const st = status[meta.key] ?? 'missing';

      // preview cell
      const preview = el('div', { class: 'preview-cell' });
      if (st === 'loaded') {
        const img = el('img', { src: `sprites/${meta.key}.png`, alt: meta.key });
        preview.append(img);
      } else {
        preview.append(el('div', { class: 'missing' }, 'no png'));
      }

      row.append(
        preview,
        el('div', { class: 'key-mono' }, meta.key),
        el('div', {}, el('span', { class: `cat-tag ${meta.category}` }, meta.category), document.createElement('br'), meta.label),
        el('div', {}, meta.usage),
        el('div', { class: 'size-mono' }, meta.size),
        el('div', { class: 'fallback' }, meta.fallback ?? ''),
        el('div', { class: `prio-${meta.priority}` },
          meta.priority === 'must' ? '🔴 MUST' : '⚪ NICE',
          document.createElement('br'),
          el('span', { class: st === 'loaded' ? 'status-loaded' : 'status-missing' },
            st === 'loaded' ? '✅' : '❌'),
        ),
      );
      section.append(row);
    }
    root.append(section);
  }

  // 새 키 추가
  {
    const section = el('section');
    section.append(
      el('h2', {}, '새 스프라이트 키 추가하기'),
      el('ol', { html: `
        <li><span class="mono">src/render/sprites.ts</span> 의 <span class="mono">SPRITE_KEYS</span> 에 항목 추가.</li>
        <li>해당 렌더 코드에 <span class="mono">tryImage(scene, key, x, y, () =&gt; fallbackShape)</span> 패턴 적용.</li>
        <li><span class="mono">public/sprites/&lt;key&gt;.png</span> 두기 (선택).</li>
        <li>이 페이지 새로고침 — 자동으로 표에 노출.</li>
      ` }),
    );
    root.append(section);
  }

  root.append(el('div', { class: 'callout', html: `
    <strong>주의</strong>: 스프라이트 파일이 없어도 게임은 동작한다 (도형 fallback).
    <br>스프라이트 작업은 게임 본 개발과 독립적.
  ` }));
}

// 초기 missing 상태로 1회 렌더 → 비동기 체크 후 재렌더
for (const meta of SPRITE_KEYS) status[meta.key] = 'missing';
render();
Promise.all(SPRITE_KEYS.map(checkOne)).then(() => render());
