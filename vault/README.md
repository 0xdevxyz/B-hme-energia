# Knowledge Vault

Central knowledge hub for all Studio client projects. This folder is designed as an Obsidian vault.

## Setup

This directory is meant to be a Git submodule from a separate `knowledge-vault` repository.

To initialize as a submodule (replace URL with your actual repo):
```bash
git submodule add https://github.com/YOUR_USER/knowledge-vault vault/
```

To use in other /saas projects:
```bash
git submodule add https://github.com/YOUR_USER/knowledge-vault .vault
```

## Structure

- `clients/` – one .md file per client (briefing, keywords, notes)
- `keywords/` – keyword lists per industry and city
- `geo-snippets/` – ready-made LLM-optimized text blocks
- `templates/` – letter templates, client communication
- `projects/` – links to /saas projects

## Obsidian Tips

- Use [[wikilinks]] to connect client notes to keyword lists
- Tag notes with #client, #keyword, #geo, #template
- Use the Dataview plugin to create dynamic client dashboards
