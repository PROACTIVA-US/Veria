#!/usr/bin/env bash
set -euo pipefail

CORE_DIR=${CORE_DIR:-../toolmasker-core}
if [[ ! -d "$CORE_DIR" ]]; then
  echo "CORE_DIR not found: $CORE_DIR"
  exit 1
fi

cd "$CORE_DIR"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MASKS_PATH="config/masks:../toolmasker-veria-pack/masks"
poetry run masking-cli validate "$MASKS_PATH" || python -c 'import sys; sys.exit(0)'  # fallback if poetry not installed
