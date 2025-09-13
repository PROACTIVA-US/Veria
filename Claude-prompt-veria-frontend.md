You are updating the **Veria project** to be Blitzy-ready.

**Instructions:**
- Remove all mentions of Vislzr and graph/timeline IDEs.
- Focus entirely on **Veria Core** as a compliance-first middleware with a **standard web UI** (Next.js + React, Tailwind, Radix).
- Update the PRD, tasks, and scaffolding accordingly:
  - Include Onboarding Wizard (Asset → Custody → SPV/Trust → Tokenization → Investor Registry → Evidence).
  - Evidence management and export (ZIP + manifest, signed URLs).
  - Investor registry with eligibility, KYC/KYB integration.
  - Tokenization adapter with jurisdictional transfer rules.
  - Blitzy export (PRD JSON + Task Graph JSON).
- Ensure all deliverables validate against schemas and are importable by Blitzy.
- Provide updated PRD.md, tasks.json, and scaffolding files (Next.js frontend boilerplate, package.json, Tailwind config, feature folder READMEs).
- Keep the repo clean and production-ready.

**Output:**
- Overwrite the existing PRD with the updated Veria-only plan. veria_master_prd_stdUI.md
- Generate `veria_prd.json` and `veria_tasks.json` (schemas included).
- Scaffold a Next.js frontend with onboarding, registry, and compliance modules.
- Validate that Blitzy can import and spin up repos, pipelines, and tickets from the outputs.
