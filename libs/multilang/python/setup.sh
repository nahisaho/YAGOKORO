#!/bin/bash
# Setup script for @yagokoro/multilang Python dependencies
# ADR-005, ADR-007, ADR-008

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"

echo "🔧 Setting up Python environment for @yagokoro/multilang..."

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="3.10"

if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    echo "❌ Python $REQUIRED_VERSION or higher is required (found $PYTHON_VERSION)"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📦 Installing Python dependencies..."
pip install -r "$SCRIPT_DIR/requirements.txt"

# Download spaCy models
echo "📦 Downloading spaCy language models..."
python -m spacy download en_core_web_sm || echo "⚠️  en_core_web_sm already installed or failed"
python -m spacy download zh_core_web_sm || echo "⚠️  zh_core_web_sm already installed or failed"
python -m spacy download ja_core_news_sm || echo "⚠️  ja_core_news_sm already installed or failed"
python -m spacy download ko_core_news_sm || echo "⚠️  ko_core_news_sm already installed or failed"

echo "✅ Python environment setup complete!"
echo ""
echo "To activate the environment manually:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "Model sizes (approximate):"
echo "  - en_core_web_sm: ~12MB"
echo "  - zh_core_web_sm: ~46MB"
echo "  - ja_core_news_sm: ~32MB"
echo "  - ko_core_news_sm: ~12MB"
echo "  Total: ~102MB"
