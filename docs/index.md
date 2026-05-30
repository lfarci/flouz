---
layout: home

hero:
  name: flouz
  text: Personal Finance CLI
  tagline: AI-powered bank transaction analysis — import, categorize, and track spending from your terminal.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Command Reference
      link: /commands/transactions

features:
  - title: 📥 Import CSV
    details: Import bank transaction CSVs into a local SQLite database. Generic format — works with any bank export.
  - title: 🤖 AI Categorization
    details: Automatically categorize transactions using AI models via the Vercel AI SDK. Review and approve suggestions before applying.
  - title: 💰 Budget Tracking
    details: Set monthly budgets per category (fixed or percentage-based) and check spending progress with color-coded dashboards.
  - title: 🔒 Privacy First
    details: All data stays local in a SQLite file. Only transaction descriptions are sent to the AI provider for categorization.
---
