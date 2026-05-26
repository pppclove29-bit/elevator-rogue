import { ActionBlockId, ConditionBlockId } from './blocks';

export interface RuleInSlot {
  id: string;
  when: ConditionBlockId[];
  then: ActionBlockId | null;
}

export function makeRuleId(): string {
  return `r-${Math.random().toString(36).slice(2, 9)}`;
}
