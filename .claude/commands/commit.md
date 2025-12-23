---
description: Create git commits
---
# Commit Changes

You are tasked with creating git commits for the changes made during this session.

## Process:

1. **Think about what changed:**
   - Review the conversation history and understand what was accomplished
   - Run `git status` to see current changes
   - Run `git diff` to understand the modifications
   - Consider whether changes should be one commit or multiple logical commits

2. **Determine commit type:**
   Analyze the changes and categorize them:
   - `feat`: New feature or functionality added
   - `fix`: Bug fix or error correction
   - `refactor`: Code restructuring without changing functionality
   - `docs`: Documentation only changes
   - `test`: Adding or updating tests
   - `chore`: Maintenance tasks (deps, configs, etc.)
   - `perf`: Performance improvements
   - `style`: Formatting, missing semicolons, etc.

3. **Plan your commit(s):**
   - Identify which files belong together
   - Draft clear, descriptive commit messages
   - Commit should be imperative mood, lowercase, no period
   - Focus on why the changes were made, not just what
   - Footer can include `BREAKING CHANGE:` for major version bumps

4. **Present your plan to the user:**
   - List the files you plan to add for each commit
   - Show the conventional commit message(s) you'll use
   - Ask: "I plan to create [N] commit(s) with these changes. Shall I proceed?"

5. **Execute upon confirmation:**
   - Use `git add` with specific files (never use `-A` or `.`)
   - Create commits with your planned messages until all of your changes are committed with git commit -m
   - Never commit dummy files, test scripts, or other files which you created or which appear to have been created but which were not part of your changes or directly caused by them (e.g. generated code)

## Examples:

- `feat(thoughts_tool): add SSH authentication callbacks for sync operations`
- `fix(universal_tool): respect configured sync values in mount operations`
- `refactor(claudecode_rs): extract common parsing logic into shared module`
- `docs: update README with new CI/CD workflow information`
- `chore(deps): update tokio to 1.40 across all packages`

## Important:
- **NEVER add co-author information or Claude attribution**
- Commits should be authored solely by the user
- Do not include any "Generated with Claude" messages
- Do not add "Co-Authored-By" lines
- Write commit messages as if the user wrote them
- **ALWAYS use conventional commit format for automated versioning**

## Breaking Changes:
If a change breaks backward compatibility, add `BREAKING CHANGE:` in the footer:
```
feat(api): change response format to JSON

BREAKING CHANGE: API responses now return JSON instead of plain text.
Consumers must update their parsing logic.
```

## Remember:
- You have the full context of what was done in this session
- Group related changes together
- Keep commits focused and atomic when possible
- The user trusts your judgment - they asked you to commit