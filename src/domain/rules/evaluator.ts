import { nearestFloor } from '../building';
import { Elevator, SimState } from '../types';
import { ACTION_BLOCKS, CONDITION_BLOCKS } from './blocks';
import { RuleInSlot } from './types';

export type Intent = { kind: 'goTo'; target: number } | { kind: 'stay' };

export interface Decision {
  intent: Intent;
  firedRuleId: string | null;
}

export function evaluate(rules: RuleInSlot[], state: SimState, elevator: Elevator): Decision {
  const here = nearestFloor(elevator.y);
  for (const rule of rules) {
    if (rule.then === null) continue;
    let matched = true;
    for (const condId of rule.when) {
      const block = CONDITION_BLOCKS[condId];
      if (!block || !block.match(state, elevator, here)) { matched = false; break; }
    }
    if (!matched) continue;
    const action = ACTION_BLOCKS[rule.then];
    if (!action) continue;
    const target = action.resolve(state, elevator, here);
    if (target === null) continue;
    if (target === 'stay') return { intent: { kind: 'stay' }, firedRuleId: rule.id };
    return { intent: { kind: 'goTo', target }, firedRuleId: rule.id };
  }
  return { intent: { kind: 'stay' }, firedRuleId: null };
}
