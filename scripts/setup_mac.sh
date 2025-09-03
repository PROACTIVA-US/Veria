
#!/bin/zsh
set -euo pipefail

echo "[+] Bootstrapping macOS dev env..."

# Python
if ! command -v pyenv >/dev/null 2>&1; then
  echo "[-] pyenv not found. Please install via brew: brew install pyenv"
else
  pyenv install -s 3.11.9
  pyenv local 3.11.9
fi

# Poetry
if ! command -v poetry >/dev/null 2>&1; then
  echo "[*] Installing Poetry..."
  curl -sSL https://install.python-poetry.org | python3 -
  export PATH="$HOME/.local/bin:$PATH"
fi

# Node
if ! command -v node >/dev/null 2>&1; then
  echo "[-] Node not found. Install via brew: brew install node"
fi

# Colima (optional)
if command -v colima >/dev/null 2>&1; then
  colima start --cpu 4 --memory 8
fi

# Python deps
poetry install

# Node deps for edge proxy
pushd packages/edge_proxy >/dev/null
npm install
popd >/dev/null

echo "[+] Done. Try: make docker-up && make api"
