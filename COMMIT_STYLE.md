# Commit Style Guide

## Commit Message Format

Use these prefixes for commit messages:

- `feature:` - New features or major functionality additions
- `refactor:` - Code structure improvements, reorganization
- `fix:` - Bug fixes
- `document:` - Documentation updates (not `docs:`)
- `chore:` - Maintenance tasks, dependency updates

## Examples

```bash
# ✅ Good
feature: implement news-list crawling functionality
refactor: simplify pipeline architecture  
fix: resolve encoding issue in Korean text
document: update README with current implementation status
chore: upgrade dependencies to latest versions

# ❌ Avoid
feat: add feature
docs: update docs
update: some changes
```

## Claude Code Integration

All commits should end with:

```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```