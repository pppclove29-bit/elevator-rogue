import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { t } from '../i18n/locale';
import { isUnlocked, loadProgression } from '../meta/progression';
import { THEMES } from '../meta/themes';
import { Button } from '../ui/Button';

export class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);

    this.add.text(GAME_WIDTH / 2, 32, t('stats.title'), {
      fontFamily: FONT, fontSize: '28px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 80, 42, 100, 28, t('common.close'), () => this.scene.stop(),
      { fontSize: 12 });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.stop());

    const p = loadProgression();
    const hasRecord = p.totalRuns > 0;
    const angryPct = p.totalServed > 0 ? Math.round((p.totalAngryServed / p.totalServed) * 100) : 0;
    const avgDay = p.totalRuns > 0 ? (Object.values(p.bestDayByTheme).reduce((a, b) => (a ?? 0) + (b ?? 0), 0)! / Math.max(1, Object.keys(p.bestDayByTheme).length)).toFixed(1) : '—';

    // 좌측 패널 — 누적 숫자
    const leftX = 140, panelY = 100, leftW = 460;
    this.add.rectangle(leftX, panelY, leftW, 380, 0x14141c, 1).setOrigin(0, 0).setStrokeStyle(1, 0x3a3a48);
    this.add.text(leftX + 20, panelY + 16, t('stats.title'), {
      fontFamily: FONT, fontSize: '16px', color: '#f5c542', fontStyle: 'bold',
    });

    if (!hasRecord) {
      this.add.text(leftX + leftW / 2, panelY + 180, t('stats.no_record'), {
        fontFamily: FONT, fontSize: '14px', color: COLORS.textDim,
      }).setOrigin(0.5);
    } else {
      const rows: Array<[string, string]> = [
        [t('stats.runs'), `${p.totalRuns}`],
        [t('stats.best_day_overall'), `${p.bestDayOverall}`],
        [t('stats.average_day'), `${avgDay}`],
        [t('stats.served'), `${p.totalServed.toLocaleString()}`],
        [t('stats.angry'), `${p.totalAngryServed.toLocaleString()} (${angryPct}%)`],
        [t('stats.gold_earned'), `${p.totalGoldEarned.toLocaleString()}${t('common.gold_suffix')}`],
      ];
      let ry = panelY + 60;
      for (const [label, value] of rows) {
        this.add.text(leftX + 24, ry, label, { fontFamily: FONT, fontSize: '13px', color: COLORS.textDim });
        this.add.text(leftX + leftW - 24, ry, value, { fontFamily: FONT, fontSize: '14px', color: COLORS.text }).setOrigin(1, 0);
        ry += 32;
      }
    }

    // 우측 패널 — 테마별 진행
    const rightX = leftX + leftW + 40, rightW = 460;
    this.add.rectangle(rightX, panelY, rightW, 380, 0x14141c, 1).setOrigin(0, 0).setStrokeStyle(1, 0x3a3a48);
    this.add.text(rightX + 20, panelY + 16, t('stats.theme_progress'), {
      fontFamily: FONT, fontSize: '16px', color: '#7ed957', fontStyle: 'bold',
    });

    let ty = panelY + 60;
    for (const theme of Object.values(THEMES)) {
      const unlocked = isUnlocked(p, theme.id);
      const best = p.bestDayByTheme[theme.id] ?? 0;
      const nameColor = unlocked ? COLORS.text : '#5a5a68';
      const prefix = unlocked ? '' : '🔒 ';
      this.add.text(rightX + 24, ty, `${prefix}${theme.name}`, {
        fontFamily: FONT, fontSize: '14px', color: nameColor,
      });
      const value = !unlocked ? t('stats.locked') : (best > 0 ? `${best}` : '—');
      const valueColor = !unlocked ? '#5a5a68' : (best > 0 ? '#f5c542' : COLORS.textDim);
      this.add.text(rightX + rightW - 24, ty, value, {
        fontFamily: FONT, fontSize: '14px', color: valueColor,
      }).setOrigin(1, 0);
      ty += 36;
    }

    // 하단 — 메인으로
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 200, 40,
      t('gameover.menu'), () => this.scene.stop(),
      { fontSize: 14, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
  }
}
