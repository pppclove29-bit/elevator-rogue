import { SOUND_KEYS, SoundMeta } from '../audio/sound';

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

// ──────────── Loaded 여부 검사 ────────────
// public/sounds/<key>.{mp3,ogg,wav} 중 하나라도 200 응답이면 loaded.
type LoadStatus = 'loaded' | 'missing';
const status: Record<string, LoadStatus> = {};
const loadedUrl: Record<string, string | null> = {};

async function checkOne(meta: SoundMeta): Promise<void> {
  const exts = ['mp3', 'ogg', 'wav'];
  for (const ext of exts) {
    const url = `sounds/${meta.key}.${ext}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        status[meta.key] = 'loaded';
        loadedUrl[meta.key] = url;
        return;
      }
    } catch {
      // ignore
    }
  }
  status[meta.key] = 'missing';
  loadedUrl[meta.key] = null;
}

function stat(label: string, value: string): HTMLElement {
  return el('div', { class: 'stat' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, value));
}

function render(): void {
  root.innerHTML = '';

  // Header
  root.append(
    el('div', { class: 'dash-header' },
      el('h1', {}, 'Elevator Rogue — Sound Catalog'),
      el('div', { class: 'subtitle' }, '사운드 작업 레퍼런스 · ',
        el('a', { href: '/' }, '게임'), ' · ',
        el('a', { href: '/docs.html' }, '코드 대시보드'), ' · ',
        el('a', { href: '/design.html' }, '디자인 카탈로그'))
    ),
  );

  // Intro
  root.append(el('div', { class: 'callout', html: `
    <strong>이 페이지의 역할</strong>: 사운드 파일 작업/구매 시 참고용 카탈로그.
    단일 진실원천: <span class="mono">src/audio/sound.ts</span> 의 <span class="mono">SOUND_KEYS</span>.<br>
    파일을 <span class="mono">public/sounds/&lt;key&gt;.mp3</span> 에 넣으면 게임이 자동 로드 (없으면 silent fallback).
    <br>새로고침 하면 로드 상태가 갱신됨. 미리듣기 ▶ 버튼은 로드된 파일만 활성.
  ` }));

  // Summary
  const total = SOUND_KEYS.length;
  const loaded = SOUND_KEYS.filter((s) => status[s.key] === 'loaded').length;
  const must = SOUND_KEYS.filter((s) => s.priority === 'must');
  const mustLoaded = must.filter((s) => status[s.key] === 'loaded').length;
  const sfxCount = SOUND_KEYS.filter((s) => s.category === 'sfx').length;
  const bgmCount = SOUND_KEYS.filter((s) => s.category === 'bgm').length;

  const summary = el('div', { class: 'sound-summary' });
  summary.append(stat('전체 키', `${loaded} / ${total}`));
  summary.append(stat('필수 (must)', `${mustLoaded} / ${must.length}`));
  summary.append(stat('SFX / BGM', `${sfxCount} / ${bgmCount}`));
  summary.append(stat('진행률', `${total === 0 ? 0 : Math.round((loaded / total) * 100)}%`));
  root.append(summary);

  // 권장 소스
  {
    const section = el('section');
    section.append(
      el('h2', {}, '권장 사운드 소스 (CC0 / CC-BY)'),
      el('ul', { html: `
        <li><a href="https://freesound.org" target="_blank" rel="noopener">freesound.org</a> — SFX 풍부, CC0/BY 필터 가능</li>
        <li><a href="https://pixabay.com/sound-effects/" target="_blank" rel="noopener">pixabay.com/sound-effects</a> — CC0, 가입 불필요</li>
        <li><a href="https://opengameart.org" target="_blank" rel="noopener">opengameart.org</a> — 게임 음악·SFX, 라이선스 명시</li>
        <li><a href="https://itch.io/game-assets/free/tag-music" target="_blank" rel="noopener">itch.io free music</a> — 인디 게임용 BGM</li>
        <li><a href="https://zapsplat.com" target="_blank" rel="noopener">zapsplat.com</a> — 가입 후 무료, 출처 표기 필요</li>
      ` }),
      el('div', { class: 'callout', html: `
        <strong>포맷 권장</strong>: <span class="mono">.mp3</span> 96–128 kbps (SFX는 더 낮춰도 OK).
        Phaser audio loader는 <span class="mono">[mp3, ogg, wav]</span> 순으로 시도.<br>
        <strong>볼륨 정규화</strong>: 모든 SFX를 -12 dBFS 정도로 normalize 권장 (개별 볼륨 cap은 SOUND_KEYS 의 <span class="mono">volume</span> 필드로 조정).
      ` }),
    );
    root.append(section);
  }

  // SFX / BGM 표
  for (const category of ['sfx', 'bgm'] as const) {
    const section = el('section');
    const items = SOUND_KEYS.filter((s) => s.category === category);
    const title = category === 'sfx' ? '효과음 (SFX)' : '배경음 (BGM)';
    section.append(el('h2', {}, title, ` (${items.length})`));

    const header = el('div', { class: 'sound-row header' });
    header.append(
      el('div', {}, 'KEY'),
      el('div', {}, '이름'),
      el('div', {}, '트리거'),
      el('div', {}, '추천 톤'),
      el('div', {}, '우선순위'),
      el('div', {}, '상태 / 듣기'),
    );
    section.append(header);

    for (const meta of items) {
      const row = el('div', { class: 'sound-row' });
      const st = status[meta.key] ?? 'missing';
      const playBtn = el('button', { class: 'play-btn' }, '▶ 듣기') as HTMLButtonElement;
      playBtn.disabled = st !== 'loaded';
      playBtn.onclick = () => {
        const url = loadedUrl[meta.key];
        if (!url) return;
        const audio = new Audio(url);
        audio.volume = meta.volume ?? 0.7;
        audio.play().catch(() => { /* ignore */ });
      };

      const statusLabel = st === 'loaded'
        ? el('span', { class: 'status-loaded' }, '✅ loaded')
        : el('span', { class: 'status-missing' }, '❌ missing');

      const right = el('div', { style: 'display:flex; gap:8px; align-items:center;' });
      right.append(statusLabel, playBtn);

      row.append(
        el('div', { class: 'key-mono' }, meta.key),
        el('div', {}, meta.label),
        el('div', { class: 'trigger' }, meta.trigger),
        el('div', { class: 'suggest' }, meta.suggest),
        el('div', { class: `prio-${meta.priority}` }, meta.priority === 'must' ? '🔴 MUST' : '⚪ NICE'),
        right,
      );
      section.append(row);
    }
    root.append(section);
  }

  // 새 키 추가
  {
    const section = el('section');
    section.append(
      el('h2', {}, '새 사운드 키 추가하기'),
      el('ol', { html: `
        <li><span class="mono">src/audio/sound.ts</span> 의 <span class="mono">SOUND_KEYS</span> 배열에 <span class="mono">{ key, category, label, trigger, suggest, priority, volume? }</span> 항목 추가.</li>
        <li>필요 시 <span class="mono">SoundManager</span> 클래스에 헬퍼 메서드 (예: <span class="mono">mySound() { this.playSfx('mySound'); }</span>).</li>
        <li>해당 메서드를 게임 코드에서 호출.</li>
        <li><span class="mono">public/sounds/&lt;key&gt;.mp3</span> 파일 두기 (선택 — 나중에 둬도 OK).</li>
        <li>이 페이지 새로고침 — 자동으로 표에 노출.</li>
      ` }),
    );
    root.append(section);
  }

  // Footer
  root.append(el('div', { class: 'callout', html: `
    <strong>주의</strong>: 사운드 파일이 없어도 게임은 동작한다. 로드 실패는 silent fallback.
    <br>즉, 사운드 작업은 게임 본 개발과 독립적으로 진행 가능.
  ` }));
}

// 첫 로딩: "검사 중" 상태로 일단 렌더 (사용자 즉시 피드백)
for (const meta of SOUND_KEYS) status[meta.key] = 'missing';
render();

// 비동기 체크 끝나면 한 번 다시 그림
Promise.all(SOUND_KEYS.map(checkOne)).then(() => render());
