/**
 * Dev-only Vite plugin: 작업 공간 파일 쓰기 endpoint.
 *
 * 1) POST /_api/save-asset?type=sprite|sound&key=<key>
 *    sprites/sounds 드래그앤드롭 → public/sprites/ 또는 public/sounds/ 저장
 *
 * 2) POST /_api/save-data?file=<filename>
 *    CMS 페이지 → data/<filename>.json 저장 (JSON 본문)
 *
 * 빌드 산출물에는 포함 X (apply: 'serve'). 프로덕션 빌드에서는 자동 비활성.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export function assetSavePlugin(): Plugin {
  return {
    name: 'asset-save',
    apply: 'serve',
    configureServer(server) {
      // ── 1) /_api/save-data — CMS JSON 저장 ──
      server.middlewares.use('/_api/save-data', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        const url = new URL(req.url ?? '', 'http://x');
        const file = url.searchParams.get('file');
        if (!file || !/^[a-zA-Z0-9_-]+\.json$/.test(file)) {
          res.statusCode = 400;
          res.end('invalid or missing file (must match [a-zA-Z0-9_-]+\\.json)');
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = Buffer.concat(chunks);
        // JSON 검증 — 잘못된 형식이면 거부
        try { JSON.parse(body.toString('utf-8')); }
        catch (e) {
          res.statusCode = 400;
          res.end(`invalid JSON: ${String(e)}`);
          return;
        }
        const targetDir = resolve(server.config.root, 'data');
        const targetPath = resolve(targetDir, file);
        try {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(targetPath, body);
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: `data/${file}` }));
          // eslint-disable-next-line no-console
          console.log(`[save-data] wrote data/${file} (${body.length} bytes)`);
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });

      // ── 2) /_api/save-asset — sprites/sounds 디스크 저장 ──
      server.middlewares.use('/_api/save-asset', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        const url = new URL(req.url ?? '', 'http://x');
        const type = url.searchParams.get('type'); // 'sprite' | 'sound'
        const key = url.searchParams.get('key');
        if (!type || !key) {
          res.statusCode = 400;
          res.end('missing type or key');
          return;
        }
        if (type !== 'sprite' && type !== 'sound') {
          res.statusCode = 400;
          res.end('type must be sprite or sound');
          return;
        }
        // key 검증 — 슬래시 / 점 안전성
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          res.statusCode = 400;
          res.end('invalid key');
          return;
        }

        // 바디 수집
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = Buffer.concat(chunks);

        const ext = type === 'sprite' ? 'png' : 'mp3';
        const folder = type === 'sprite' ? 'public/sprites' : 'public/sounds';
        const targetDir = resolve(server.config.root, folder);
        const targetPath = resolve(targetDir, `${key}.${ext}`);

        try {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(targetPath, body);
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: `${folder}/${key}.${ext}` }));
          // eslint-disable-next-line no-console
          console.log(`[asset-save] wrote ${folder}/${key}.${ext} (${body.length} bytes)`);
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
    },
  };
}
