#!/bin/bash
# QMF Version Update Script
# Updates version numbers across all QMF files and optionally renames files
# Usage: ./version-update.sh <new_version> [--rename]

set -e

# Configuration
QMF_ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION_FILE="$QMF_ROOT/.qmf-version"
CURRENT_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || echo "1.0.0")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Show usage
usage() {
    echo "QMF Version Update Script"
    echo ""
    echo "Usage: $0 <new_version> [options]"
    echo ""
    echo "Options:"
    echo "  --rename        Rename files with version suffix (e.g., runtime.1.0.0.js)"
    echo "  --no-backup     Don't create backup before updating"
    echo "  --dry-run       Show what would be changed without making changes"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 1.1.0                  # Update version to 1.1.0"
    echo "  $0 1.1.0 --rename         # Update and rename files with version"
    echo "  $0 1.1.0 --dry-run        # Preview changes"
    echo ""
    echo "Current version: $CURRENT_VERSION"
}

# Validate version format (semver)
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        print_error "Invalid version format: $version"
        print_info "Version must follow semantic versioning (e.g., 1.0.0, 1.0.0-beta)"
        exit 1
    fi
}

# Create backup
create_backup() {
    local backup_dir="$QMF_ROOT/../.qmf-backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$backup_dir/qmf_backup_${CURRENT_VERSION}_$timestamp"
    
    mkdir -p "$backup_dir"
    cp -r "$QMF_ROOT" "$backup_path"
    
    print_success "Backup created at: $backup_path"
}

# Update version in JS files (in @version JSDoc)
update_js_version() {
    local file=$1
    local new_version=$2
    local dry_run=$3
    
    if [ "$dry_run" = true ]; then
        print_info "[DRY-RUN] Would update version in: $file"
        return
    fi
    
    # Update @version in JSDoc
    if grep -q "@version" "$file"; then
        sed -i "s/@version [0-9]\+\.[0-9]\+\.[0-9]\+[a-zA-Z0-9-]*/@version $new_version/g" "$file"
    fi
    
    # Update version: 'x.x.x' pattern
    sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+[a-zA-Z0-9-]*'/version: '$new_version'/g" "$file"
    sed -i "s/version: \"[0-9]\+\.[0-9]\+\.[0-9]\+[a-zA-Z0-9-]*\"/version: \"$new_version\"/g" "$file"
}

# Update version in CSS files
update_css_version() {
    local file=$1
    local new_version=$2
    local dry_run=$3
    
    if [ "$dry_run" = true ]; then
        print_info "[DRY-RUN] Would update version in: $file"
        return
    fi
    
    if grep -q "@version" "$file"; then
        sed -i "s/@version [0-9]\+\.[0-9]\+\.[0-9]\+[a-zA-Z0-9-]*/@version $new_version/g" "$file"
    fi
}

# Rename file with version
rename_with_version() {
    local file=$1
    local new_version=$2
    local dry_run=$3
    
    local dir=$(dirname "$file")
    local filename=$(basename "$file")
    local name="${filename%.*}"
    local ext="${filename##*.}"
    
    # Check if already has version in name
    if [[ $name =~ \.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        # Replace existing version
        local base_name=$(echo "$name" | sed 's/\.[0-9]\+\.[0-9]\+\.[0-9]\+[a-zA-Z0-9-]*//')
        local new_name="${base_name}.${new_version}.${ext}"
    else
        local new_name="${name}.${new_version}.${ext}"
    fi
    
    local new_path="$dir/$new_name"
    
    if [ "$dry_run" = true ]; then
        print_info "[DRY-RUN] Would rename: $filename -> $new_name"
        return
    fi
    
    if [ "$file" != "$new_path" ]; then
        mv "$file" "$new_path"
        print_info "Renamed: $filename -> $new_name"
    fi
}

# Process all files
process_files() {
    local new_version=$1
    local rename=$2
    local dry_run=$3
    
    local js_count=0
    local css_count=0
    
    # Process JS files
    while IFS= read -r -d '' file; do
        update_js_version "$file" "$new_version" "$dry_run"
        if [ "$rename" = true ]; then
            rename_with_version "$file" "$new_version" "$dry_run"
        fi
        ((js_count++))
    done < <(find "$QMF_ROOT" -name "*.js" -type f -print0)
    
    # Process CSS files
    while IFS= read -r -d '' file; do
        update_css_version "$file" "$new_version" "$dry_run"
        if [ "$rename" = true ]; then
            rename_with_version "$file" "$new_version" "$dry_run"
        fi
        ((css_count++))
    done < <(find "$QMF_ROOT" -name "*.css" -type f -print0)
    
    print_info "Processed $js_count JS files and $css_count CSS files"
}

# Update import paths if files were renamed
update_imports() {
    local old_version=$1
    local new_version=$2
    local dry_run=$3
    
    if [ "$dry_run" = true ]; then
        print_info "[DRY-RUN] Would update import paths from .$old_version. to .$new_version."
        return
    fi
    
    # Update imports in all JS files
    find "$QMF_ROOT" -name "*.js" -type f -exec sed -i \
        "s/\.$old_version\.\(js\|css\)/.$new_version.\1/g" {} \;
    
    print_info "Updated import paths"
}

# Generate version manifest
generate_manifest() {
    local new_version=$1
    local dry_run=$2
    
    local manifest_file="$QMF_ROOT/version-manifest.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [ "$dry_run" = true ]; then
        print_info "[DRY-RUN] Would generate manifest at: $manifest_file"
        return
    fi
    
    cat > "$manifest_file" << EOF
{
    "version": "$new_version",
    "previousVersion": "$CURRENT_VERSION",
    "updatedAt": "$timestamp",
    "files": {
        "kernel": [
            "kernel/runtime.js",
            "kernel/module-loader.js",
            "kernel/lifecycle.js",
            "kernel/event-bus.js",
            "kernel/context.js",
            "kernel/guard.js"
        ],
        "platform": [
            "platform/device.js",
            "platform/viewport.js",
            "platform/capability.js",
            "platform/performance.js"
        ],
        "layout": [
            "layout/shell.js",
            "layout/regions.js",
            "layout/mount.js"
        ],
        "navigation": [
            "navigation/router.js",
            "navigation/menu-registry.js",
            "navigation/breadcrumb.js"
        ],
        "ui": [
            "ui/button/index.js",
            "ui/modal/index.js",
            "ui/dropdown/index.js",
            "ui/overlay/index.js"
        ],
        "feedback": [
            "feedback/toast.js",
            "feedback/loading.js",
            "feedback/dialog.js"
        ],
        "theme": [
            "theme/tokens.css",
            "theme/dark.css",
            "theme/motion.css",
            "theme/typography.css"
        ],
        "plugins": [
            "plugins/header/index.js",
            "plugins/sidebar/index.js",
            "plugins/footer/index.js",
            "plugins/command-palette/index.js",
            "plugins/notification-center/index.js"
        ],
        "apps": [
            "apps/dict.js",
            "apps/play.js",
            "apps/lms.js",
            "apps/admin.js"
        ],
        "main": [
            "public-api.js"
        ]
    },
    "checksums": {}
}
EOF
    
    print_success "Generated version manifest"
}

# Save new version
save_version() {
    local new_version=$1
    local dry_run=$2
    
    if [ "$dry_run" = true ]; then
        print_info "[DRY-RUN] Would save version: $new_version"
        return
    fi
    
    echo "$new_version" > "$VERSION_FILE"
    print_success "Version updated: $CURRENT_VERSION -> $new_version"
}

# Main function
main() {
    local new_version=""
    local rename=false
    local no_backup=false
    local dry_run=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rename)
                rename=true
                shift
                ;;
            --no-backup)
                no_backup=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                if [ -z "$new_version" ]; then
                    new_version=$1
                else
                    print_error "Unknown option: $1"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Check if version provided
    if [ -z "$new_version" ]; then
        print_error "No version specified"
        usage
        exit 1
    fi
    
    # Validate version
    validate_version "$new_version"
    
    # Check if same version
    if [ "$new_version" = "$CURRENT_VERSION" ]; then
        print_warning "New version is same as current version ($CURRENT_VERSION)"
        exit 0
    fi
    
    print_info "Updating QMF from v$CURRENT_VERSION to v$new_version"
    
    # Create backup
    if [ "$no_backup" = false ] && [ "$dry_run" = false ]; then
        create_backup
    fi
    
    # Process files
    process_files "$new_version" "$rename" "$dry_run"
    
    # Update imports if renamed
    if [ "$rename" = true ]; then
        update_imports "$CURRENT_VERSION" "$new_version" "$dry_run"
    fi
    
    # Generate manifest
    generate_manifest "$new_version" "$dry_run"
    
    # Save version
    save_version "$new_version" "$dry_run"
    
    if [ "$dry_run" = true ]; then
        print_warning "Dry run completed. No changes were made."
    else
        print_success "Version update complete!"
    fi
}

# Run main
main "$@"
