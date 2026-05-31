#!/bin/bash
# QMF SSL Setup Script
# Generates self-signed SSL certificate for development
# or sets up Let's Encrypt for production

set -e

QMF_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="/etc/nginx/ssl"
DOMAIN="quizzman.com"
SUBDOMAINS="share,dict,play,lms,admin"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

usage() {
    echo "QMF SSL Setup Script"
    echo ""
    echo "Usage: $0 <mode>"
    echo ""
    echo "Modes:"
    echo "  self-signed    Generate self-signed certificate for development"
    echo "  letsencrypt    Set up Let's Encrypt certificate for production"
    echo ""
    echo "Examples:"
    echo "  sudo $0 self-signed"
    echo "  sudo $0 letsencrypt"
}

# Generate self-signed certificate
generate_self_signed() {
    print_info "Generating self-signed SSL certificate..."
    
    mkdir -p "$SSL_DIR"
    
    # Generate private key
    openssl genrsa -out "$SSL_DIR/qmf-selfsigned.key" 4096
    
    # Generate CSR config
    cat > "$SSL_DIR/qmf-csr.conf" << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = VN
ST = Ho Chi Minh
L = Ho Chi Minh City
O = Quizzman
OU = Development
CN = $DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

    # Generate certificate
    openssl req -x509 -nodes -days 365 \
        -key "$SSL_DIR/qmf-selfsigned.key" \
        -out "$SSL_DIR/qmf-selfsigned.crt" \
        -config "$SSL_DIR/qmf-csr.conf"
    
    # Set permissions
    chmod 600 "$SSL_DIR/qmf-selfsigned.key"
    chmod 644 "$SSL_DIR/qmf-selfsigned.crt"
    
    print_success "Self-signed certificate generated at $SSL_DIR"
    print_warning "Remember to add the certificate to your browser's trusted certificates for local development"
    
    # Print cert info
    print_info "Certificate info:"
    openssl x509 -in "$SSL_DIR/qmf-selfsigned.crt" -noout -subject -dates
}

# Setup Let's Encrypt
setup_letsencrypt() {
    print_info "Setting up Let's Encrypt certificate..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Build domain list
    local domains="-d $DOMAIN"
    IFS=',' read -ra SUBS <<< "$SUBDOMAINS"
    for sub in "${SUBS[@]}"; do
        domains="$domains -d $sub.$DOMAIN"
    done
    
    # Request certificate
    print_info "Requesting certificate for: $DOMAIN and subdomains"
    
    certbot --nginx $domains \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        --redirect
    
    # Setup auto-renewal
    print_info "Setting up auto-renewal..."
    
    # Create renewal hook
    cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh
    
    # Test auto-renewal
    certbot renew --dry-run
    
    print_success "Let's Encrypt certificate installed successfully"
    print_info "Certificate will auto-renew before expiration"
}

# Main
main() {
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    
    case "$1" in
        self-signed)
            generate_self_signed
            ;;
        letsencrypt)
            setup_letsencrypt
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
