import { SPRITE_KEYS, SpriteCategory } from '../render/sprites';
import { deleteAsset, loadAllStoredAssets, saveAsset } from '../assets/storage';
import { generatePlaceholder } from './placeholder';

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
const previewUrl: Record<string, string | null> = {};
let storedKeys = new Set<string>();

const SPRITE_KEY_SET = new Set(SPRITE_KEYS.map((s) => s.key));

async function refreshStatuses(): Promise<void> {
  // 기존 ObjectURL revoke
  for (const k of Object.keys(previewUrl)) {
    const url = previewUrl[k];
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
  storedKeys = new Set<string>();

  const stored = await loadAllStoredAssets();
  for (const [storageKey, asset] of stored) {
    if (!storageKey.startsWith('sprites/')) continue;
    const key = storageKey.slice('sprites/'.length);
    if (!SPRITE_KEY_SET.has(key)) continue;
    status[key] = 'loaded-upload';
    previewUrl[key] = URL.createObjectURL(asset.blob);
    storedKeys.add(key);
  }

  await Promise.all(SPRITE_KEYS.filter((m) => !storedKeys.has(m.key)).map(async (meta) => {
    try {
      const res = await fetch(`sprites/${meta.key}.png`, { method: 'HEAD' });
      if (res.ok) { status[meta.key] = 'loaded-public'; previewUrl[meta.key] = `sprites/${meta.key}.png`; return; }
    } catch { /* ignore */ }
    status[meta.key] = 'missing';
    previewUrl[meta.key] = null;
  }));
}

function stat(label: string, value: string): HTMLElement {
  return el('div', { class: 'stat' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, value));
}

async function handleFiles(files: FileList | File[]): Promise<void> {
  const rejected: string[] = [];
  const accepted: string[] = [];
  const diskFailed: string[] = [];
  for (const file of Array.from(files)) {
    const base = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    if (!SPRITE_KEY_SET.has(base)) { rejected.push(file.name); continue; }
    // 1) public/sprites/ 디스크에 저장 시도 (dev 서버 endpoint 경유)
    const diskOk = await uploadToDisk('sprite', base, file);
    // 2) 디스크 실패 시에만 IndexedDB fallback (배포 빌드 등)
    if (!diskOk) {
      diskFailed.push(base);
      await saveAsset(`sprites/${base}`, file);
    }
    accepted.push(base);
  }
  if (rejected.length > 0) {
    alert(`인식 못한 파일 (이름이 <key>.png 형식이어야 함):\n${rejected.join('\n')}\n\n허용된 key 목록은 표 참고.`);
  }
  if (diskFailed.length > 0) {
    console.warn('[sprites] 디스크 저장 실패, IndexedDB 로 fallback:', diskFailed);
  }
  if (accepted.length > 0) {
    await refreshStatuses();
    render();
  }
}

/** dev 서버 endpoint 로 파일 업로드 → public/sprites/<key>.png 에 저장. 성공 시 true. */
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
  await deleteAsset(`sprites/${key}`);
  await refreshStatuses();
  render();
}

/** 키 배열에 대해 placeholder 일괄 생성. 디스크 우선 + IndexedDB fallback. */
async function runBulk(keys: string[]): Promise<void> {
  const metas = SPRITE_KEYS.filter((m) => keys.includes(m.key));
  let ok = 0; let fail = 0;
  for (const meta of metas) {
    try {
      const file = await generatePlaceholder(meta);
      const diskOk = await uploadToDisk('sprite', meta.key, file);
      if (!diskOk) await saveAsset(`sprites/${meta.key}`, file);
      ok += 1;
    } catch (e) {
      console.warn('[bulk] failed for', meta.key, e);
      fail += 1;
    }
  }
  await refreshStatuses();
  render();
  alert(`완료: ${ok}개 생성${fail > 0 ? `, ${fail}개 실패 (콘솔 참고)` : ''}.\n게임 새로고침하면 적용됨.`);
}

const CATEGORY_ORDER: SpriteCategory[] = ['character', 'elevator', 'passenger', 'floor', 'environment', 'ui', 'decoration'];
const CATEGORY_LABEL: Record<SpriteCategory, string> = {
  character: '캐릭터 portrait (다이얼로그)',
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
    <strong>이 페이지의 역할</strong>: 스프라이트 파일을 게임에 적용. 단일 진실원천:
    <span class="mono">src/render/sprites.ts</span> 의 <span class="mono">SPRITE_KEYS</span>.<br>
    <strong>파일 적용 방법 — 둘 중 아무거나</strong><br>
    1) 아래 드래그앤드롭에 <span class="mono">&lt;key&gt;.png</span> 파일 (브라우저에 저장, 즉시 게임 적용)<br>
    2) <span class="mono">public/sprites/&lt;key&gt;.png</span> 폴더에 직접 두기 (개발 환경)<br>
    <strong>스타일</strong>: 픽셀 아트 32~64px, 색 8~16 팔레트, 투명 배경.
  ` }));

  // Drop zone
  const dropZone = el('div', {
    class: 'drop-zone',
    style: 'border: 2px dashed #4a90e2; padding: 22px; text-align: center; border-radius: 8px; margin: 16px 0; background: #14141c; cursor: pointer; color: #9aa0a6;',
  });
  dropZone.innerHTML = `<strong>여기에 스프라이트 파일 드래그 (PNG 권장)</strong><br><span style="font-size: 12px;">파일명이 <span style="color:#e2a04a">&lt;key&gt;.png</span> 형식이면 자동 매칭 (예: elevator-cab.png)</span>`;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#1c1c26'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#14141c'; });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.style.background = '#14141c';
    if (e.dataTransfer?.files) await handleFiles(e.dataTransfer.files);
  });
  const fileInput = el('input', { type: 'file', multiple: 'multiple', accept: '.png,.jpg,.jpeg,.webp', style: 'display:none' }) as HTMLInputElement;
  fileInput.onchange = async () => { if (fileInput.files) await handleFiles(fileInput.files); fileInput.value = ''; };
  dropZone.addEventListener('click', () => fileInput.click());
  root.append(dropZone, fileInput);

  // ── 일괄 placeholder 생성 버튼 ──
  const bulkBar = el('div', {
    style: 'display: flex; gap: 8px; align-items: center; margin: 0 0 16px 0; padding: 12px; background: #14141c; border: 1px solid #2a2a35; border-radius: 6px;',
  });
  bulkBar.append(
    el('div', { style: 'flex: 1; color: #9aa0a6; font-size: 12px;' },
      el('strong', { style: 'color: #f5c542;' }, '🎨 placeholder 자동 생성'),
      ' — 카테고리별 단순 모양으로 미생성 키 한 번에 채움. 마음에 안 드는 건 개별 교체.'),
    (() => {
      const btn = el('button', {
        style: 'background: #4a90e2; color: #0b0b10; padding: 8px 14px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;',
      }, '미생성 키만 생성') as HTMLButtonElement;
      btn.onclick = async () => {
        const targets = SPRITE_KEYS.filter((m) => status[m.key] !== 'loaded-public' && status[m.key] !== 'loaded-upload');
        if (targets.length === 0) { alert('모든 키가 이미 채워져 있습니다.'); return; }
        if (!confirm(`${targets.length}개 키에 placeholder 생성?`)) return;
        await runBulk(targets.map((m) => m.key));
      };
      return btn;
    })(),
    (() => {
      const btn = el('button', {
        style: 'background: #2a2a35; color: #f5f5f5; padding: 8px 14px; border: 1px solid #4a4a55; border-radius: 4px; cursor: pointer;',
      }, '전체 재생성') as HTMLButtonElement;
      btn.onclick = async () => {
        if (!confirm(`전체 ${SPRITE_KEYS.length}개 키 placeholder 재생성? (기존 업로드 덮어쓰기)`)) return;
        await runBulk(SPRITE_KEYS.map((m) => m.key));
      };
      return btn;
    })(),
  );
  root.append(bulkBar);

  const total = SPRITE_KEYS.length;
  const loaded = SPRITE_KEYS.filter((s) => status[s.key]?.startsWith('loaded')).length;
  const uploaded = SPRITE_KEYS.filter((s) => status[s.key] === 'loaded-upload').length;
  const must = SPRITE_KEYS.filter((s) => s.priority === 'must');
  const mustLoaded = must.filter((s) => status[s.key]?.startsWith('loaded')).length;

  const summary = el('div', { class: 'sprite-summary' });
  summary.append(stat('전체 키', `${loaded} / ${total}`));
  summary.append(stat('업로드', `${uploaded}`));
  summary.append(stat('필수 (must)', `${mustLoaded} / ${must.length}`));
  summary.append(stat('진행률', `${total === 0 ? 0 : Math.round((loaded / total) * 100)}%`));
  root.append(summary);

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
      el('div', {}, '상태 / 교체'),
    );
    section.append(header);

    for (const meta of items) {
      const row = el('div', { class: 'sprite-row' });
      const st = status[meta.key] ?? 'missing';

      const preview = el('div', { class: 'preview-cell' });
      const url = previewUrl[meta.key];
      if (url) preview.append(el('img', { src: url, alt: meta.key }));
      else preview.append(el('div', { class: 'missing' }, 'no img'));

      const replaceBtn = el('button', { class: 'play-btn', title: '업로드' }, '📤') as HTMLButtonElement;
      const replaceInput = el('input', { type: 'file', accept: '.png,.jpg,.jpeg,.webp', style: 'display:none' }) as HTMLInputElement;
      replaceInput.onchange = async () => { if (replaceInput.files?.[0]) await handleFiles([replaceInput.files[0]]); };
      replaceBtn.onclick = () => replaceInput.click();

      const deleteBtn = el('button', { class: 'play-btn', title: '업로드 삭제' }, '🗑️') as HTMLButtonElement;
      deleteBtn.disabled = st !== 'loaded-upload';
      deleteBtn.onclick = () => { if (confirm(`${meta.key} 업로드 삭제?`)) clearKey(meta.key); };

      const statusLabel = st === 'loaded-upload'
        ? el('span', { class: 'status-loaded' }, '📤')
        : st === 'loaded-public' ? el('span', { class: 'status-loaded' }, '✅')
          : el('span', { class: 'status-missing' }, '❌');

      const right = el('div', { style: 'display:flex; gap:4px; align-items:center; flex-direction:column;' });
      const r1 = el('div', { style: 'display:flex; gap:4px; align-items:center;' });
      r1.append(statusLabel, replaceBtn, deleteBtn, replaceInput);
      right.append(el('span', { class: `prio-${meta.priority}` }, meta.priority === 'must' ? '🔴 MUST' : '⚪'), r1);

      row.append(
        preview,
        el('div', { class: 'key-mono' }, meta.key),
        el('div', {}, el('span', { class: `cat-tag ${meta.category}` }, meta.category), document.createElement('br'), meta.label),
        el('div', {}, meta.usage),
        el('div', { class: 'size-mono' }, meta.size),
        el('div', { class: 'fallback' }, meta.fallback ?? ''),
        right,
      );
      section.append(row);
    }
    root.append(section);
  }

  root.append(el('div', { class: 'callout', html: `
    <strong>주의</strong>: 업로드 파일은 브라우저 IndexedDB 에 저장 (origin 별). 다른 브라우저/머신에선 다시 업로드 필요.
    배포 빌드 시 게임에 포함하려면 <span class="mono">public/sprites/</span> 폴더에 두기.
  ` }));
}

for (const meta of SPRITE_KEYS) status[meta.key] = 'missing';
render();
refreshStatuses().then(() => render());
