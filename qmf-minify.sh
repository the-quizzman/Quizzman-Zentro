#!/bin/bash
# =============================================================
# QMF Source Minification Script (Safe Mode)
#
# FLOW: _src/ (source of truth) → minify → dist/ (output)
#   - _src/ is NEVER written to during minification
#   - dist/ is always regenerated from _src/
#   - Running multiple times is safe (idempotent)
#
# Note: /opt/Quizzman/qmf is a symlink to /opt/Quizzman/QMF
#
# Usage:
#   bash qmf-minify.sh              # Minify _src/ → dist/
#   bash qmf-minify.sh --init       # First-time: copy dist/ → _src/ (one-time)
#   bash qmf-minify.sh --restore    # Restore dist/ from _src/ (unminified)
#   bash qmf-minify.sh --status     # Show _src/ vs dist/ sizes
#   bash qmf-minify.sh --force      # Skip source verification
# =============================================================
set -uo pipefail

QMF_DIR="/opt/Quizzman/QMF"
DIST_DIR="$QMF_DIR/dist"
SRC_DIR="$QMF_DIR/_src"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[QMF]${NC} $1"; }
warn() { echo -e "${YELLOW}[QMF]${NC} $1"; }
err()  { echo -e "${RED}[QMF]${NC} $1"; }
info() { echo -e "${CYAN}[QMF]${NC} $1"; }

# =============================================================
# Safety: verify _src/ contains unminified source (>1 line)
# =============================================================
verify_src_not_minified() {
    local bad=0
    while IFS= read -r -d '' f; do
        lines=$(wc -l < "$f")
        size=$(wc -c < "$f")
        # Minified files are typically 0-1 lines but large in size
        if [[ "$lines" -le 1 && "$size" -gt 500 ]]; then
            err "  WARNING: $f looks minified ($size bytes, $lines lines)"
            bad=$((bad + 1))
        fi
    done < <(find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.css" \) -print0)
    if [[ "$bad" -gt 0 ]]; then
        err "$bad file(s) in _src/ look minified. Aborting to protect source."
        err "Use --force to override this check."
        return 1
    fi
    return 0
}

# =============================================================
# --status: show comparison
# =============================================================
if [[ "${1:-}" == "--status" ]]; then
    if [[ ! -d "$SRC_DIR" ]]; then
        err "_src/ does not exist. Run --init first."; exit 1
    fi
    echo ""
    info "=== _src/ vs dist/ comparison ==="
    printf "%-50s %10s %10s %8s\n" "FILE" "SRC" "DIST" "SAVED"
    printf "%-50s %10s %10s %8s\n" "----" "---" "----" "-----"
    while IFS= read -r -d '' srcfile; do
        rel="${srcfile#$SRC_DIR/}"
        distfile="$DIST_DIR/$rel"
        src_size=$(wc -c < "$srcfile" 2>/dev/null || echo "0")
        if [[ -f "$distfile" ]]; then
            dist_size=$(wc -c < "$distfile")
            if [[ "$src_size" -gt 0 ]]; then
                pct=$((100 - dist_size * 100 / src_size))
            else
                pct=0
            fi
            printf "%-50s %8sB %8sB  -%d%%\n" "$rel" "$src_size" "$dist_size" "$pct"
        else
            printf "%-50s %8sB %10s\n" "$rel" "$src_size" "MISSING"
        fi
    done < <(find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.cjs" \) -print0 | sort -z)
    exit 0
fi

# =============================================================
# --init: one-time backup of dist/ → _src/
# =============================================================
if [[ "${1:-}" == "--init" ]]; then
    if [[ -d "$SRC_DIR" ]]; then
        err "_src/ already exists. Will not overwrite."
        err "If you need to re-init, manually remove _src/ first."
        exit 1
    fi
    log "Initializing: copying dist/ → _src/ (one-time backup)..."
    mkdir -p "$SRC_DIR"
    cd "$DIST_DIR"
    while IFS= read -r -d '' f; do
        mkdir -p "$SRC_DIR/$(dirname "$f")"
        cp "$f" "$SRC_DIR/$f"
        log "  Saved: $f"
    done < <(find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.cjs" \) \
        ! -name "*.min.js" ! -name "*.min.css" ! -name "*.cdn.min.js" ! -name "*.map" \
        -print0)
    log "Init complete. _src/ is now the source of truth."
    log "Run 'bash qmf-minify.sh' to minify into dist/."
    exit 0
fi

# =============================================================
# --restore: copy _src/ → dist/ (unminified)
# =============================================================
if [[ "${1:-}" == "--restore" ]]; then
    if [[ ! -d "$SRC_DIR" ]]; then
        err "_src/ does not exist. Nothing to restore."; exit 1
    fi
    log "Restoring unminified sources: _src/ → dist/..."
    while IFS= read -r -d '' srcfile; do
        rel="${srcfile#$SRC_DIR/}"
        dest="$DIST_DIR/$rel"
        mkdir -p "$(dirname "$dest")"
        cp "$srcfile" "$dest"
        log "  Restored: $rel"
    done < <(find "$SRC_DIR" -type f -print0)
    log "Restore complete. dist/ now contains unminified files."
    exit 0
fi

# =============================================================
# Default: minify _src/ → dist/
# =============================================================
if [[ ! -d "$SRC_DIR" ]]; then
    err "_src/ does not exist!"
    err "Run 'bash qmf-minify.sh --init' first to backup sources."
    exit 1
fi

# Check dependencies
command -v terser >/dev/null 2>&1 || { err "terser not found. Install: npm i -g terser"; exit 1; }
command -v cleancss >/dev/null 2>&1 || { err "clean-css not found. Install: npm i -g clean-css-cli"; exit 1; }

# Safety check: verify _src/ has real source, not already-minified
if [[ "${1:-}" != "--force" ]]; then
    verify_src_not_minified || exit 1
fi

JS_OK=0; JS_FAIL=0; CSS_OK=0; CSS_FAIL=0

# --- Minify JS/CJS: read _src/, write dist/ ---
log "Minifying JavaScript: _src/ → dist/..."
while IFS= read -r -d '' srcfile; do
    rel="${srcfile#$SRC_DIR/}"
    base=$(basename "$rel")
    [[ "$base" == *.min.js || "$base" == *.cdn.min.js ]] && continue

    dest="$DIST_DIR/$rel"
    mkdir -p "$(dirname "$dest")"

    tmpfile=$(mktemp)
    if terser "$srcfile" --compress "drop_console=false,passes=2" --mangle --output "$tmpfile" 2>/dev/null; then
        cat "$tmpfile" > "$dest"
        rm -f "$tmpfile"
        log "  OK: $rel"
        JS_OK=$((JS_OK + 1))
    elif terser "$srcfile" --compress --mangle --output "$tmpfile" 2>/dev/null; then
        cat "$tmpfile" > "$dest"
        rm -f "$tmpfile"
        log "  OK: $rel (fallback)"
        JS_OK=$((JS_OK + 1))
    else
        rm -f "$tmpfile"
        # On failure, copy unminified so nothing is missing
        cp "$srcfile" "$dest"
        err "  FAIL (copied unminified): $rel"
        JS_FAIL=$((JS_FAIL + 1))
    fi
done < <(find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.cjs" \) -print0 | sort -z)

# --- Minify CSS: read _src/, write dist/ ---
log "Minifying CSS: _src/ → dist/..."
while IFS= read -r -d '' srcfile; do
    rel="${srcfile#$SRC_DIR/}"
    base=$(basename "$rel")
    [[ "$base" == *.min.css ]] && continue

    dest="$DIST_DIR/$rel"
    mkdir -p "$(dirname "$dest")"

    tmpfile=$(mktemp)
    if cleancss -o "$tmpfile" "$srcfile" 2>/dev/null && [[ -s "$tmpfile" ]]; then
        cat "$tmpfile" > "$dest"
        rm -f "$tmpfile"
        log "  OK: $rel"
        CSS_OK=$((CSS_OK + 1))
    else
        rm -f "$tmpfile"
        cp "$srcfile" "$dest"
        err "  FAIL (copied unminified): $rel"
        CSS_FAIL=$((CSS_FAIL + 1))
    fi
done < <(find "$SRC_DIR" -type f -name "*.css" -print0 | sort -z)

# --- Remove source maps from dist/ only ---
log "Removing source maps from dist/..."
MAP_COUNT=$(find "$DIST_DIR" -type f -name "*.map" | wc -l)
while IFS= read -r -d '' m; do
    mv "$m" /tmp/ 2>/dev/null || true
done < <(find "$DIST_DIR" -type f -name "*.map" -print0)
log "  Moved $MAP_COUNT map files to /tmp."

# --- Strip sourceMappingURL from dist/ only ---
log "Stripping sourceMappingURL references from dist/..."
while IFS= read -r -d '' f; do
    if grep -q 'sourceMappingURL' "$f" 2>/dev/null; then
        sed -i '/sourceMappingURL/d' "$f"
        log "  Stripped: ${f#$DIST_DIR/}"
    fi
done < <(find "$DIST_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.cjs" \) -print0)

echo ""
log "========================================="
log "  QMF Minification Complete"
log "  Source:  $SRC_DIR (untouched)"
log "  Output:  $DIST_DIR"
log "  JS/CJS:  $JS_OK ok, $JS_FAIL fail"
log "  CSS:     $CSS_OK ok, $CSS_FAIL fail"
log "  Maps:    $MAP_COUNT removed"
log "========================================="
log "Commands:"
log "  bash $0 --status   # Compare sizes"
log "  bash $0 --restore  # Undo minification"
