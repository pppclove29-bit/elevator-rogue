import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TICK_MS } from '../config';
import { phaseAtTick } from '../domain/phase';
import { SimState } from '../domain/types';
import { localizeCard } from '../i18n/cards';
import { t } from '../i18n/locale';
import { recordDailyRun } from '../meta/daily';
import { loadProgression, recordRunEnd, saveProgression, unlockLabel } from '../meta/progression';
import { RELICS } from '../meta/relics';
import { clearSave } from '../meta/save';
import { SKILLS } from '../meta/skills';
import { THEMES } from '../meta/themes';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

export class GameOverScene extends Phaser.Scene {
  private gs!: GameScene;

  constructor() { super('GameOver'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    const s = this.gs.state;

    // 게임 오버 = 런 종료. 저장 삭제 + 진행도 기록.
    clearSave();
    const themeId = (this.gs as any).themeId ?? 'office';
    const challengeId = (this.gs as any).challengeId ?? null;
    const finalDay = s.dayCompleted + 1;

    // 신기록 비교는 record 호출 *전*에 prev 캡쳐
    const prog = loadProgression();
    const prevBest = challengeId
      ? (prog.bestDayByChallenge?.[challengeId] ?? 0)
      : (prog.bestDayByTheme[themeId as keyof typeof prog.bestDayByTheme] ?? 0);
    const isNewBest = finalDay > prevBest;

    const newUnlocks = recordRunEnd(prog, themeId, finalDay, s.servedCount, s.gold, s.angryServedCount, challengeId);
    saveProgression(prog);
    const dailySeed = (this.gs as any).dailySeed as number | null | undefined;
    if (dailySeed) recordDailyRun(dailySeed, finalDay);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);

    // 상단 GAME OVER 라벨 (작게)
    this.add.text(GAME_WIDTH / 2, 44, t('gameover.title'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '24px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 가운데 큰 결과 — "N 일차 도달" + 카운트업
    const dayLabel = this.add.text(GAME_WIDTH / 2, 100, '0', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '88px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 110, 130, '일차', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '24px', color: COLORS.textDim,
    }).setOrigin(0, 1);
    // 카운트업
    this.tweens.addCounter({
      from: 0, to: finalDay,
      duration: Math.min(1200, 80 * finalDay + 200),
      onUpdate: (tw) => dayLabel.setText(String(Math.round(tw.getValue() ?? 0))),
    });

    // 신기록 배너 — 가운데 위. 빛나는 효과.
    if (isNewBest && finalDay > 1) {
      const banner = this.add.text(GAME_WIDTH / 2, 168, `✨  NEW BEST  ✨   (이전 ${prevBest})`, {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
        fontSize: '16px', color: '#f5c542', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: banner, alpha: 1, duration: 400, delay: 400 });
      this.tweens.add({ targets: banner, scale: 1.08, yoyo: true, repeat: -1, duration: 700, delay: 800, ease: 'Sine.easeInOut' });
    }

    // 플레이버 문구
    this.add.text(GAME_WIDTH / 2, 200, this.deathFlavor(s), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '13px', color: COLORS.textDim, fontStyle: 'italic',
    }).setOrigin(0.5);

    // 통계 패널
    const panelX = 180, panelY = 230, panelW = GAME_WIDTH - 360, panelH = 320;
    this.add.rectangle(panelX, panelY, panelW, panelH, 0x14141c, 1).setOrigin(0, 0).setStrokeStyle(1, 0x3a3a48);

    this.add.text(panelX + 20, panelY + 16, t('gameover.summary_title'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '16px', color: '#f5c542', fontStyle: 'bold',
    });

    // 좌측 — 숫자 통계
    const stats = this.collectStats(s);
    let y = panelY + 56;
    for (const [label, value] of stats) {
      this.add.text(panelX + 24, y, label, { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '13px', color: COLORS.textDim });
      this.add.text(panelX + 280, y, value, { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '14px', color: COLORS.text });
      y += 26;
    }

    // 우측 — 획득 카드 리스트
    const rightX = panelX + 440;
    this.add.text(rightX, panelY + 56, t('gameover.acquired_relics'), { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '13px', color: '#e2a04a' });
    if (s.ownedRelics.length === 0) {
      this.add.text(rightX, panelY + 80, t('common.empty'), { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: '#5a5a68' });
    } else {
      let ry = panelY + 80;
      for (const id of s.ownedRelics) {
        const r = RELICS[id];
        const nm = r ? localizeCard('relic', r).name : id;
        this.add.text(rightX, ry, `• ${nm}`, { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: COLORS.text });
        ry += 18;
      }
    }

    const rightX2 = rightX + 200;
    this.add.text(rightX2, panelY + 56, t('gameover.held_skills'), { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '13px', color: '#7ed957' });
    if (s.ownedSkills.length === 0) {
      this.add.text(rightX2, panelY + 80, t('common.empty'), { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: '#5a5a68' });
    } else {
      let ry = panelY + 80;
      for (const id of s.ownedSkills) {
        const sk = SKILLS[id];
        const nm = sk ? localizeCard('skill', sk).name : id;
        this.add.text(rightX2, ry, `• ${nm}`, { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: COLORS.text });
        ry += 18;
      }
    }

    // 해금 알림 (있으면)
    if (newUnlocks.length > 0) {
      const noticeY = panelY + panelH + 12;
      this.add.rectangle(panelX, noticeY, panelW, 50, 0x2a3d1f, 1).setOrigin(0, 0).setStrokeStyle(2, 0x7ed957);
      this.add.text(panelX + panelW / 2, noticeY + 8, t('gameover.unlock_banner'), {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '14px', color: '#7ed957', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      const names = newUnlocks.map((id) => THEMES[id]?.name ?? id).join(', ');
      this.add.text(panelX + panelW / 2, noticeY + 28, names + ' — ' + unlockLabel(newUnlocks[0]!), {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: COLORS.text,
      }).setOrigin(0.5, 0);
    }

    // 버튼
    const btnY = GAME_HEIGHT - 70;
    new Button(this, GAME_WIDTH / 2 - 130, btnY, 200, 44, t('gameover.retry'), () => this.restart(),
      { fontSize: 14, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
    new Button(this, GAME_WIDTH / 2 + 130, btnY, 200, 44, t('gameover.menu'), () => this.toTitle(),
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
      [t('gameover.stat.survival'), `${m}m ${sec.toString().padStart(2, '0')}s`],
      [t('gameover.stat.last_day'), `${info.day + 1} · ${t(`phase.${info.phase}` as 'phase.morning')}`],
      [t('gameover.stat.served'), `${s.servedCount}`],
      [t('gameover.stat.angry_served'), `${s.angryServedCount} (${angryPct}%)`],
      [t('gameover.stat.gold'), `${s.gold}${t('common.gold_suffix')}`],
      [t('gameover.stat.floors'), `${s.building.floors.length}`],
      [t('gameover.stat.elevators'), `${elev.length} (cap ${totalCap})`],
      [t('gameover.stat.relics'), `${s.ownedRelics.length}`],
      [t('gameover.stat.skills'), `${s.ownedSkills.length}`],
      [t('gameover.stat.modifiers'), `${s.activeModifiers.length}`],
    ];
  }

  private deathFlavor(s: SimState): string {
    const day = phaseAtTick(s.tick).day + 1;
    if (day <= 1) return t('gameover.flavor.0');
    if (day <= 3) return t('gameover.flavor.3');
    if (day <= 7) return t('gameover.flavor.7');
    if (day <= 14) return t('gameover.flavor.14');
    return t('gameover.flavor.max');
  }
}
