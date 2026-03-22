---
description: 'Guidelines for creating high-quality Agent Skills for GitHub Copilot'
applyTo: '**/.github/skills/**/SKILL.md, **/.claude/skills/**/SKILL.md'
---

# Agent Skills File Guidelines

Instructions for creating effective and portable Agent Skills that enhance GitHub Copilot with specialized capabilities, workflows, and bundled resources.

## What Are Agent Skills?

Agent Skills are self-contained folders with instructions and bundled resources that teach AI agents specialized capabilities. Unlike custom instructions (which define coding standards), skills enable task-specific workflows that can include scripts, examples, templates, and reference data.

Key characteristics:
- **Portable**: Works across VS Code, Copilot CLI, and Copilot coding agent
- **Progressive loading**: Only loaded when relevant to the user's request
- **Resource-bundled**: Can include scripts, templates, examples alongside instructions
- **On-demand**: Activated automatically based on prompt relevance

## Directory Structure

Skills are stored in specific locations:

| Location | Scope | Recommendation |
|----------|-------|----------------|
| `.github/skills/<skill-name>/` | Project/repository | Recommended for project skills |
| `.claude/skills/<skill-name>/` | Project/repository | Legacy, for backward compatibility |
| `~/.github/skills/<skill-name>/` | Personal (user-wide) | Recommended for personal skills |
| `~/.claude/skills/<skill-name>/` | Personal (user-wide) | Legacy, for backward compatibility |

Each skill **must** have its own subdirectory containing at minimum a `SKILL.md` file.

## Required SKILL.md Format

### Frontmatter (Required)

```yaml
---
name: webapp-testing
description: Toolkit for testing local web applications using Playwright. Use when asked to verify frontend functionality, debug UI behavior, capture browser screenshots, check for visual regressions, or view browser console logs. Supports Chrome, Firefox, and WebKit browsers.
license: Complete terms in LICENSE.txt
---
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Lowercase, hyphens for spaces, max 64 characters (e.g., `webapp-testing`) |
| `description` | Yes | Clear description of capabilities AND use cases, max 1024 characters |
| `license` | No | Reference to LICENSE.txt (e.g., `Complete terms in LICENSE.txt`) or SPDX identifier |

### Description Best Practices

**CRITICAL**: The `description` field is the PRIMARY mechanism for automatic skill discovery. Copilot reads ONLY the `name` and `description` to decide whether to load a skill. If your description is vague, the skill will never be activated.

**What to include in description:**
1. **WHAT** the skill does (capabilities)
2. **WHEN** to use it (specific triggers, scenarios, file types, or user requests)
3. **Keywords** that users might mention in their prompts

### Body Content

The body contains detailed instructions that Copilot loads AFTER the skill is activated. Recommended sections:

| Section | Purpose |
|---------|---------|
| `# Title` | Brief overview of what this skill enables |
| `## When to Use This Skill` | List of scenarios (reinforces description triggers) |
| `## Prerequisites` | Required tools, dependencies, environment setup |
| `## Step-by-Step Workflows` | Numbered steps for common tasks |
| `## Troubleshooting` | Common issues and solutions table |
| `## References` | Links to bundled docs or external resources |

## Bundling Resources

Skills can include additional files that Copilot accesses on-demand:

| Folder | Purpose | Loaded into Context? |
|--------|---------|---------------------|
| `scripts/` | Executable automation | When executed |
| `references/` | Documentation the AI agent reads | Yes, when referenced |
| `assets/` | Static files used AS-IS in output | No |
| `templates/` | Starter code the AI agent modifies | Yes, when referenced |

## Progressive Loading Architecture

| Level | What Loads | When |
|-------|------------|------|
| 1. Discovery | `name` and `description` only | Always (lightweight metadata) |
| 2. Instructions | Full `SKILL.md` body | When request matches description |
| 3. Resources | Scripts, examples, docs | Only when Copilot references them |

## Validation Checklist

Before publishing a skill:

- [ ] `SKILL.md` has valid frontmatter with `name` and `description`
- [ ] `name` is lowercase with hyphens, ≤64 characters
- [ ] `description` clearly states **WHAT** it does, **WHEN** to use it, and relevant **KEYWORDS**
- [ ] Body includes when to use, prerequisites, and step-by-step workflows
- [ ] SKILL.md body kept under 500 lines (split large content into `references/` folder)
- [ ] Scripts include help documentation and error handling
- [ ] No hardcoded credentials or secrets

## Related Resources

- [Agent Skills Specification](https://agentskills.io/)
- [VS Code Agent Skills Documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Awesome Copilot Skills](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md)
