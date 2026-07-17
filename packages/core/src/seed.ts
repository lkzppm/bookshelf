/** Sample cards used to seed a demo shelf so the graph has something to show. */
export interface SeedFile {
  file: string;
  content: string;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export function sampleShelfCards(): SeedFile[] {
  const d = TODAY();
  const card = (file: string, content: string): SeedFile => ({
    file,
    content: content.replaceAll("$DATE", d),
  });

  return [
    card(
      "EP-0001-task-management.md",
      `---
id: EP-0001
type: epic
title: Task management
status: approved
description: Users capture, organize and complete tasks across devices
owner: sample
tags: [sample]
created: $DATE
updated: $DATE
---

## Problem

Teams lose track of commitments scattered across chats and inboxes. Acme Tasks
gives them one place to capture, organize, and complete work.

## Success metrics

- 70% weekly retention after 4 weeks
- Median task capture < 5 seconds
`,
    ),
    card(
      "FT-0001-task-crud.md",
      `---
id: FT-0001
type: feature
title: Task CRUD
status: building
description: Create, edit, complete and delete tasks
owner: sample
tags: [sample, core]
links:
  parent: EP-0001
  relates-to: [CO-0001, ST-0001]
created: $DATE
updated: $DATE
---

Create, edit, complete, and delete tasks. The foundation every other feature
builds on — see [[CO-0001]] for the domain model.
`,
    ),
    card(
      "FT-0002-reminders.md",
      `---
id: FT-0002
type: feature
title: Reminders
status: draft
description: Time and location based reminders for tasks
owner: sample
tags: [sample]
links:
  parent: EP-0001
  depends-on: [FT-0001]
created: $DATE
updated: $DATE
---

Notify users when a task is due. Depends on task CRUD being in place.
`,
    ),
    card(
      "US-0001-create-task.md",
      `---
id: US-0001
type: story
title: Create a task
status: done
description: As a user I can create a task with a title and optional due date
owner: sample
tags: [sample]
links:
  parent: FT-0001
  relates-to: [ST-0001]
created: $DATE
updated: $DATE
---

As a user, I want to create a task with a title and optional due date, so that
I can capture work the moment I think of it.

## Acceptance Criteria

- When the user submits a non-empty title, the system shall create a task and show it in the list.
- If the title is empty, then the system shall keep the form open and show a validation message.
`,
    ),
    card(
      "US-0002-complete-task.md",
      `---
id: US-0002
type: story
title: Complete a task
status: building
description: As a user I can mark a task as done
owner: sample
tags: [sample]
links:
  parent: FT-0001
  depends-on: [US-0001]
created: $DATE
updated: $DATE
---

As a user, I want to mark a task as done, so that my list reflects reality.

## Acceptance Criteria

- When the user checks a task, the system shall mark it done and move it to the completed section.
`,
    ),
    card(
      "US-0003-due-reminder.md",
      `---
id: US-0003
type: story
title: Due-time reminder
status: draft
description: As a user I get notified when a task is due
owner: sample
tags: [sample]
links:
  parent: FT-0002
  depends-on: [US-0001]
created: $DATE
updated: $DATE
---

As a user, I want a notification when a task reaches its due time, so that I
don't miss deadlines.

## Acceptance Criteria

- When a task's due time is reached, the system shall send a push notification within 60 seconds.
`,
    ),
    card(
      "CO-0001-task-domain-model.md",
      `---
id: CO-0001
type: concept
title: Task domain model
status: approved
description: Core entities — Task, List, Reminder — and their invariants
owner: sample
tags: [sample, domain]
load: auto
created: $DATE
updated: $DATE
---

## Entities

- **Task**: title, optional due date, status (open/done). Belongs to one List.
- **List**: named container, user-owned.
- **Reminder**: fires at a time for one Task; deleted with its task.

## Invariants

- A task's due date may be null; a reminder's fire time may not.
- Completing a task cancels its pending reminders.
`,
    ),
    card(
      "ST-0001-api-conventions.md",
      `---
id: ST-0001
type: standard
title: API conventions
status: approved
description: REST conventions every Acme Tasks endpoint follows
owner: sample
tags: [sample, api]
load: always
created: $DATE
updated: $DATE
---

- Nouns, plural, kebab-case: \`/tasks\`, \`/task-lists\`.
- Errors: RFC 7807 problem+json.
- Timestamps: ISO-8601 UTC only.
- Pagination: \`?cursor=\` + \`?limit=\` (max 100).
`,
    ),
  ];
}
