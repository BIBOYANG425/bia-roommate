@AGENTS.md

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## File Header Maintenance (MANDATORY — team-wide)

Many core files in this repo open with a 4-line purpose header ending
`Header last reviewed: YYYY-MM-DD`. These exist so any reader (human or AI)
understands what a file owns before reading its code.

When you edit a file that has such a header:

1. **Re-read the header first.** Does it still accurately describe the file's
   purpose, flow, and responsibilities? If the change you're about to make
   alters any of those, rewrite the summary lines.
2. **Always bump the date** on `Header last reviewed:` to today's date,
   even if the summary text didn't change — it signals "a reviewer confirmed
   this is still accurate as of <date>."
3. **Never leave a stale header.** A wrong description is worse than no
   description. If you're not sure whether the summary still holds, pause
   and ask rather than leaving it misleading.
4. **Don't add new headers** to files that don't have one unless someone
   explicitly asks — the convention is reserved for architecture-critical
   files, not every module.

Find stale headers across the repo with:
`grep -rn "Header last reviewed:" --include="*.ts" --include="*.tsx"`
(sort by date; anything older than the file's last git-log date is suspect).
