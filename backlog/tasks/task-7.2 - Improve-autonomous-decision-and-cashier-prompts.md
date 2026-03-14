---
id: TASK-7.2
title: Improve autonomous decision and cashier prompts
status: To Do
assignee: []
created_date: '2026-03-14 17:35'
labels:
  - backend
  - agent
dependencies: []
parent_task_id: TASK-7
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update AUTONOMOUS_SYSTEM_PROMPT: explain reasoning with specific numbers (how many sold, percentage of orders, margin impact).
Update CASHIER_SYSTEM_PROMPT: mention specials naturally, handle "what is good?", upsell once per conversation.
Test edge cases: vegetarian, cheapest, order changes, "one of everything".
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Autonomous decisions include 1-2 sentence reasoning with numbers
- [ ] #2 Cashier handles 6+ edge case scenarios gracefully
- [ ] #3 No crashes or state corruption during rapid ordering
<!-- AC:END -->
