import { SOUND_KEYS } from '../audio/sound';
import { deleteAsset, loadAllStoredAssets, saveAsset } from '../assets/storage';
import { canSynthesize, synthesizableKeys, synthesizeSound } from './synth';

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

type LoadStatus = 'loaded-public' | 'loaded-upload' | 'missing';
const status: Record<string, LoadStatus> = {};
const loadedUrl: Record<string, string | null> = {};
let storedKeys = new Set<string>();

const SOUND_KEY_SET = new Set(SOUND_KEYS.map((s) => s.key));

async function refreshStatuses(): Promise<void> {
  // 1) IndexedDB 우선
  const stored = await loadAllStoredAssets();
  storedKeys = new Set<string>();
  for (const [storageKey, asset] of stored) {
    if (!storageKey.startsWith('sounds/')) continue;
    const key = storageKey.slice('sounds/'.length);
    if (!SOUND_KEY_SET.has(key)) continue;
    status[key] = 'loaded-upload';
    if (loadedUrl[key]) URL.revokeObjectURL(loadedUrl[key]!);
    loadedUrl[key] = URL.createObjectURL(asset.blob);
    storedKeys.add(key);
  }
  // 2) public/ HEAD 시도 (IndexedDB 없는 키만)
  await Promise.all(SOUND_KEYS.filter((m) => !storedKeys.has(m.key)).map(async (meta) => {
    const exts = ['mp3', 'ogg', 'wav'];
    for (const ext of exts) {
      const url = `sounds/${meta.key}.${ext}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) { status[meta.key] = 'loaded-public'; loadedUrl[meta.key] = url; return; }
      } catch { /* ignore */ }
    }
    status[meta.key] = 'missing';
    loadedUrl[meta.key] = null;
  }));
}

function stat(label: string, value: string): HTMLElement {
  return el('div', { class: 'stat' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, value));
}

async function handleFiles(files: FileList | File[]): Promise<void> {
  const accepted: string[] = [];
  const rejected: string[] = [];
  const diskFailed: string[] = [];
  for (const file of Array.from(files)) {
    const base = file.name.replace(/\.(mp3|ogg|wav)$/i, '');
    if (!SOUND_KEY_SET.has(base)) {
      rejected.push(file.name);
      continue;
    }
    // 1) public/sounds/ 디스크에 저장 (dev 서버 endpoint)
    const diskOk = await uploadToDisk('sound', base, file);
    // 2) 실패 시 IndexedDB fallback
    if (!diskOk) {
      diskFailed.push(base);
      await saveAsset(`sounds/${base}`, file);
    }
    accepted.push(base);
  }
  if (rejected.length > 0) {
    alert(`인식 못한 파일 (이름이 <key>.mp3 형식이어야 함):\n${rejected.join('\n')}\n\n허용된 key 목록은 표 참고.`);
  }
  if (diskFailed.length > 0) {
    console.warn('[sounds] 디스크 저장 실패, IndexedDB fallback:', diskFailed);
  }
  if (accepted.length > 0) {
    await refreshStatuses();
    render();
  }
}

/** 합성 가능한 키들에 대해 일괄 placeholder 생성 (BGM 제외). */
async function runBulkSynth(keys: string[]): Promise<void> {
  let ok = 0; let fail = 0;
  for (const key of keys) {
    if (!canSynthesize(key)) continue;
    try {
      const file = await synthesizeSound(key);
      const diskOk = await uploadToDisk('sound', key, file);
      if (!diskOk) await saveAsset(`sounds/${key}`, file);
      ok += 1;
    } catch (e) {
      console.warn('[bulk] failed for', key, e);
      fail += 1;
    }
  }
  await refreshStatuses();
  render();
  alert(`완료: ${ok}개 합성${fail > 0 ? `, ${fail}개 실패` : ''}.\n게임 새로고침하면 적용됨.\nBGM 4종은 합성 제외 — 외부 음원 필요.`);
}

/** dev 서버 endpoint 로 파일 업로드 → public/sounds/<key>.mp3 에 저장. 성공 시 true. */
async function uploadToDisk(type: 'sprite' | 'sound', key: string, file: File): Promise<boolean> {
  try {
    const res = await fetch(`/_api/save-asset?type=${type}&key=${encodeURIComponent(key)}`, {
      method: 'POST',
      body: file,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function clearKey(key: string): Promise<void> {
  await deleteAsset(`sounds/${key}`);
  await refreshStatuses();
  render();
}

function render(): void {
  root.innerHTML = '';

  root.append(
    el('div', { class: 'dash-header' },
      el('h1', {}, 'Elevator Rogue — Sound Catalog'),
      el('div', { class: 'subtitle' }, '사운드 작업 레퍼런스 · ',
        el('a', { href: '/' }, '게임'), ' · ',
        el('a', { href: '/docs.html' }, '코드 대시보드'), ' · ',
        el('a', { href: '/design.html' }, '디자인 카탈로그'), ' · ',
        el('a', { href: '/sprites.html' }, '스프라이트 카탈로그'))
    ),
  );

  root.append(el('div', { class: 'callout', html: `
    <strong>이 페이지의 역할</strong>: 사운드 파일을 게임에 적용. 단일 진실원천:
    <span class="mono">src/audio/sound.ts</span> 의 <span class="mono">SOUND_KEYS</span>.<br>
    <strong>파일 적용 방법 — 둘 중 아무거나</strong><br>
    1) 아래 드래그앤드롭에 <span class="mono">&lt;key&gt;.mp3</span> 파일 (브라우저에 저장, 즉시 게임 적용)<br>
    2) <span class="mono">public/sounds/&lt;key&gt;.mp3</span> 폴더에 직접 두기 (개발 환경)<br>
    저장된 파일은 <strong>📤 upload</strong> 표시. 없으면 silent fallback (도형/무음).
  ` }));

  // Drop zone
  const dropZone = el('div', {
    class: 'drop-zone',
    style: 'border: 2px dashed #4a90e2; padding: 22px; text-align: center; border-radius: 8px; margin: 16px 0; background: #14141c; cursor: pointer; color: #9aa0a6;',
  });
  dropZone.innerHTML = `<strong>여기에 사운드 파일 드래그</strong><br><span style="font-size: 12px;">파일명이 <span style="color:#e2a04a">&lt;key&gt;.mp3</span> 형식이면 자동 매칭 (예: ding.mp3, coin.mp3)</span>`;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#1c1c26'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#14141c'; });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.style.background = '#14141c';
    if (e.dataTransfer?.files) await handleFiles(e.dataTransfer.files);
  });
  // 클릭 시 파일 선택기
  const fileInput = el('input', { type: 'file', multiple: 'multiple', accept: '.mp3,.ogg,.wav', style: 'display:none' }) as HTMLInputElement;
  fileInput.onchange = async () => { if (fileInput.files) await handleFiles(fileInput.files); fileInput.value = ''; };
  dropZone.addEventListener('click', () => fileInput.click());
  root.append(dropZone, fileInput);

  // ── 일괄 합성 placeholder 버튼 ──
  const bulkBar = el('div', {
    style: 'display: flex; gap: 8px; align-items: center; margin: 0 0 16px 0; padding: 12px; background: #14141c; border: 1px solid #2a2a35; border-radius: 6px;',
  });
  bulkBar.append(
    el('div', { style: 'flex: 1; color: #9aa0a6; font-size: 12px;' },
      el('strong', { style: 'color: #f5c542;' }, '🎵 합성 placeholder 일괄 생성'),
      ' — Web Audio API 합성으로 SFX 11종을 즉시. BGM 4종은 외부 음원 필요.'),
    (() => {
      const btn = el('button', {
        style: 'background: #4a90e2; color: #0b0b10; padding: 8px 14px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;',
      }, '미생성 SFX 합성') as HTMLButtonElement;
      btn.onclick = async () => {
        const targets = SOUND_KEYS
          .filter((m) => canSynthesize(m.key))
          .filter((m) => status[m.key] !== 'loaded-public' && status[m.key] !== 'loaded-upload')
          .map((m) => m.key);
        if (targets.length === 0) { alert('합성 가능한 SFX 가 이미 모두 채워져 있습니다.'); return; }
        if (!confirm(`${targets.length}개 SFX 합성?`)) return;
        await runBulkSynth(targets);
      };
      return btn;
    })(),
    (() => {
      const btn = el('button', {
        style: 'background: #2a2a35; color: #f5f5f5; padding: 8px 14px; border: 1px solid #4a4a55; border-radius: 4px; cursor: pointer;',
      }, '전체 재합성') as HTMLButtonElement;
      btn.onclick = async () => {
        const targets = synthesizableKeys();
        if (!confirm(`전체 SFX ${targets.length}개 재합성? (기존 덮어쓰기)`)) return;
        await runBulkSynth(targets);
      };
      return btn;
    })(),
  );
  root.append(bulkBar);

  const total = SOUND_KEYS.length;
  const loaded = SOUND_KEYS.filter((s) => status[s.key]?.startsWith('loaded')).length;
  const uploaded = SOUND_KEYS.filter((s) => status[s.key] === 'loaded-upload').length;
  const must = SOUND_KEYS.filter((s) => s.priority === 'must');
  const mustLoaded = must.filter((s) => status[s.key]?.startsWith('loaded')).length;

  const summary = el('div', { class: 'sound-summary' });
  summary.append(stat('전체 키', `${loaded} / ${total}`));
  summary.append(stat('업로드', `${uploaded}`));
  summary.append(stat('필수 (must)', `${mustLoaded} / ${must.length}`));
  summary.append(stat('진행률', `${total === 0 ? 0 : Math.round((loaded / total) * 100)}%`));
  root.append(summary);

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
      el('div', {}, '상태 / 듣기 / 교체'),
    );
    section.append(header);

    for (const meta of items) {
      const row = el('div', { class: 'sound-row' });
      const st = status[meta.key] ?? 'missing';

      const playBtn = el('button', { class: 'play-btn' }, '▶') as HTMLButtonElement;
      playBtn.disabled = !st.startsWith('loaded');
      playBtn.onclick = () => {
        const url = loadedUrl[meta.key];
        if (!url) return;
        const audio = new Audio(url);
        audio.volume = meta.volume ?? 0.7;
        audio.play().catch(() => { /* ignore */ });
      };

      const replaceBtn = el('button', { class: 'play-btn', title: 'IndexedDB 에 업로드' }, '📤') as HTMLButtonElement;
      const replaceInput = el('input', { type: 'file', accept: '.mp3,.ogg,.wav', style: 'display:none' }) as HTMLInputElement;
      replaceInput.onchange = async () => { if (replaceInput.files?.[0]) await handleFiles([replaceInput.files[0]]); };
      replaceBtn.onclick = () => { replaceInput.click(); };

      const deleteBtn = el('button', { class: 'play-btn', title: '업로드 삭제' }, '🗑️') as HTMLButtonElement;
      deleteBtn.disabled = st !== 'loaded-upload';
      deleteBtn.onclick = () => { if (confirm(`${meta.key} 업로드 삭제?`)) clearKey(meta.key); };

      const statusLabel = st === 'loaded-upload'
        ? el('span', { class: 'status-loaded' }, '📤 upload')
        : st === 'loaded-public'
          ? el('span', { class: 'status-loaded' }, '✅ public')
          : el('span', { class: 'status-missing' }, '❌ missing');

      const right = el('div', { style: 'display:flex; gap:6px; align-items:center;' });
      right.append(statusLabel, playBtn, replaceBtn, deleteBtn, replaceInput);

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

  // 권장 소스
  {
    const section = el('section');
    section.append(
      el('h2', {}, '권장 사운드 소스 (CC0 / CC-BY)'),
      el('ul', { html: `
        <li><a href="https://freesound.org" target="_blank" rel="noopener">freesound.org</a> — SFX 풍부</li>
        <li><a href="https://pixabay.com/sound-effects/" target="_blank" rel="noopener">pixabay.com/sound-effects</a> — CC0</li>
        <li><a href="https://opengameart.org" target="_blank" rel="noopener">opengameart.org</a></li>
        <li><a href="https://itch.io/game-assets/free/tag-music" target="_blank" rel="noopener">itch.io free music</a></li>
      ` }),
    );
    root.append(section);
  }

  root.append(el('div', { class: 'callout', html: `
    <strong>주의</strong>: 업로드 파일은 브라우저 IndexedDB 에 저장 (origin 별). 다른 브라우저/머신에선 다시 업로드 필요.
    배포 빌드 시 게임에 포함하려면 <span class="mono">public/sounds/</span> 폴더에 두기.
  ` }));
}

// 초기 missing 상태로 렌더 → 비동기 체크 후 재렌더
for (const meta of SOUND_KEYS) status[meta.key] = 'missing';
render();
refreshStatuses().then(() => render());
