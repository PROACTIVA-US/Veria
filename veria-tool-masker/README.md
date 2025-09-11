
# Toolmasker — Veria Mask Pack

This repository contains **Veria-specific masks** only. Use it with the **Toolmasker Core** service.

## Usage

**Option A: Mount alongside core**

```bash
# From Toolmasker Core repo
export MASKS_PATH="config/masks:/path/to/toolmasker-veria-pack/masks"
uvicorn masker_service.main:app --reload --port 8088
```

The core engine will load masks from both locations. (You can also copy these YAMLs into your own repo.)

**Option B: Point only to Veria pack**

```bash
export MASKS_PATH="/path/to/toolmasker-veria-pack/masks"
uvicorn masker_service.main:app --reload --port 8088
```

> The engine recursively loads all `*.yaml` masks under `MASKS_PATH` (single path or colon-separated list).

## Roles
Each mask may include `meta.roles` — match these with your agents' `context.role` to enable simple role gating.

## Included Masks
- `veria_treasury_yield`
- `veria_sec_recent_10k`
- `veria_kyc_validate`
- `veria_order_subscribe_mmfs`

Edit the YAMLs and fill real endpoints/headers. Keep system-only keys in the core `.env` and reference via `{{ env.KEY }}` in templates.


---

## CI Validation
This repo includes `.github/workflows/veria-ci.yml`.
It checks out Toolmasker Core, installs its dependencies,
and runs `masking-cli validate` against the Veria masks to ensure they load cleanly.


---

## Continuous Validation (optional)
This repo includes `.github/workflows/validate.yml` to validate masks against **Toolmasker Core**.

- Set `CORE_REPO` to your actual core repo path (e.g., `your-org/toolmasker-core`).
- The workflow checks out Core, installs dependencies, and runs the mask validator on this pack.
- For local validation, from this repo:
  ```bash
  CORE_DIR=../toolmasker-core ./scripts/validate_with_core.sh
  ```
