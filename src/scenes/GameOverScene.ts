import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TICK_MS } from '../config';
import { phaseAtTick } from '../domain/phase';
import { SimState } from '../domain/types';
import { RELICS } from '../meta/relics';
import { clearSave } from '../meta/save';
import { SKILLS } from '../meta/skills';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

export class GameOverScene extends Phaser.Scene {
  private gs!: GameScene;

  constructor() { super('GameOver'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    const s = this.gs.state;

    // 게임 오버 = 런 종료. 저장 삭제.
    clearSave();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);

    // 타이틀
    this.add.text(GAME_WIDTH / 2, 60, '게임 오버', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '56px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 130, this.deathFlavor(s), {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '14px', color: COLORS.textDim, fontStyle: 'italic',
    }).setOrigin(0.5);

    // 통계 패널
    const panelX = 180, panelY = 180, panelW = GAME_WIDTH - 360, panelH = 360;
    this.add.rectangle(panelX, panelY, panelW, panelH, 0x14141c, 1).setOrigin(0, 0).setStrokeStyle(1, 0x3a3a48);

    this.add.text(panelX + 20, panelY + 16, '이번 런 결산', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '16px', color: '#f5c542', fontStyle: 'bold',
    });

    // 좌측 — 숫자 통계
    const stats = this.collectStats(s);
    let y = panelY + 56;
    for (const [label, value] of stats) {
      this.add.text(panelX + 24, y, label, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.textDim });
      this.add.text(panelX + 280, y, value, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '14px', color: COLORS.text });
      y += 26;
    }

    // 우측 — 획득 카드 리스트
    const rightX = panelX + 440;
    this.add.text(rightX, panelY + 56, '획득 유물', { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: '#e2a04a' });
    if (s.ownedRelics.length === 0) {
      this.add.text(rightX, panelY + 80, '— 없음', { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: '#5a5a68' });
    } else {
      let ry = panelY + 80;
      for (const id of s.ownedRelics) {
        const r = RELICS[id];
        this.add.text(rightX, ry, `• ${r?.name ?? id}`, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: COLORS.text });
        ry += 18;
      }
    }

    const rightX2 = rightX + 200;
    this.add.text(rightX2, panelY + 56, '보유 스킬', { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: '#7ed957' });
    if (s.ownedSkills.length === 0) {
      this.add.text(rightX2, panelY + 80, '— 없음', { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: '#5a5a68' });
    } else {
      let ry = panelY + 80;
      for (const id of s.ownedSkills) {
        const sk = SKILLS[id];
        this.add.text(rightX2, ry, `• ${sk?.name ?? id}`, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: COLORS.text });
        ry += 18;
      }
    }

    // 버튼
    const btnY = GAME_HEIGHT - 70;
    new Button(this, GAME_WIDTH / 2 - 130, btnY, 200, 44, '다시 도전 (R)', () => this.restart(),
      { fontSize: 14, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
    new Button(this, GAME_WIDTH / 2 + 130, btnY, 200, 44, '메인 메뉴', () => this.toTitle(),
      { fontSize: 14 });

    this.input.keyboard?.on('keydown-R', () => this.restart());
  }

  private restart(): void {
    this.gs.restart();
    this.scene.stop();
  }

  private toTitle(): void {
    this.scene.stop('Game');
    this.scene.stop('HUD');
    this.scene.stop('RuleEditor');
    this.scene.stop('Shop');
    this.scene.stop('Modifier');
    this.scene.stop('Relic');
    this.scene.stop();
    this.scene.start('Title');
  }

  private collectStats(s: SimState): Array<[string, string]> {
    const totalSec = Math.floor((s.tick * TICK_MS) / 1000);
    const m = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const info = phaseAtTick(s.tick);
    const elev = s.building.elevators;
    const totalCap = elev.reduce((a, e) => a + e.capacity, 0);
    const angryPct = s.servedCount > 0 ? Math.round((s.angryServedCount / s.servedCount) * 100) : 0;

    return [
      ['생존 시간', `${m}분 ${sec.toString().padStart(2, '0')}초`],
      ['최종 일자', `${info.day + 1}일차 · ${this.phaseLabel(info.phase)}`],
      ['처리 승객', `${s.servedCount}명`],
      ['그중 불만 처리', `${s.angryServedCount}명 (${angryPct}%)`],
      ['최종 골드', `${s.gold}G`],
      ['최종 빌딩', `${s.building.floors.length}층`],
      ['엘리베이터', `${elev.length}대 · 총 정원 ${totalCap}`],
      ['보유 유물', `${s.ownedRelics.length}개`],
      ['보유 스킬', `${s.ownedSkills.length}개`],
      ['활성 변수', `${s.activeModifiers.length}개`],
    ];
  }

  private phaseLabel(p: string): string {
    const map: Record<string, string> = { morning: '출근', work: '근무', lunch: '점심', evening: '퇴근', night: '야간' };
    return map[p] ?? p;
  }

  private deathFlavor(s: SimState): string {
    const day = phaseAtTick(s.tick).day + 1;
    if (day <= 1) return '하루도 못 버틸 줄이야...';
    if (day <= 3) return '운영 정책을 조금만 더 다듬어보세요.';
    if (day <= 7) return '꽤 버텼습니다. 한 주는 채울 수 있을까?';
    if (day <= 14) return '베테랑 운영자의 경지에 가까워졌습니다.';
    return '전설적인 빌딩 운영자였습니다.';
  }
}
