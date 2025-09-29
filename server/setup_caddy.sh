#!/bin/bash

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up Caddy proxy server for api.balda-game.com..."
echo "Working directory: $(pwd)"

# Check if running as root (required for installing packages)
if [ "$EUID" -ne 0 ]; then
    echo "This script needs to be run with sudo privileges for installation."
    echo "Please run: sudo ./setup_caddy.sh"
    exit 1
fi

# Update package list
echo "Updating package list..."
apt update

# Install required packages
echo "Installing required packages..."
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add Caddy's GPG key
echo "Adding Caddy's official GPG key..."
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add Caddy's repository
echo "Adding Caddy's repository..."
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list

# Update package list with new repository
echo "Updating package list with Caddy repository..."
apt update

# Install Caddy
echo "Installing Caddy..."
apt install -y caddy

# Create Caddyfile in the server directory
echo "Creating Caddyfile..."
cat > "$SCRIPT_DIR/Caddyfile" << 'EOF'
# Caddy configuration for api.balda-game.com
# This will automatically obtain and renew SSL certificates

api.balda-game.com {
    # Reverse proxy to local Vosk server running on port 8000
    reverse_proxy localhost:8000

    # Enable gzip compression
    encode gzip

    # Add CORS headers for browser compatibility
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization, Accept, X-Requested-With"
    }

    # Handle preflight requests
    @options method OPTIONS
    respond @options 204

    # Logging
    log {
        output file /var/log/caddy/api.balda-game.com.access.log
        format json
    }

    # Error handling
    handle_errors {
        respond "Service temporarily unavailable" 503
    }
}

# Redirect www subdomain to main domain
www.api.balda-game.com {
    redir https://api.balda-game.com{uri}
}
EOF

# Create log directory
echo "Creating log directory..."
mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy

# Create systemd service file for running from server directory
echo "Creating custom Caddy service..."
cat > /etc/systemd/system/caddy-balda.service << EOF
[Unit]
Description=Caddy HTTP/2 web server for Balda Game API
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --config $SCRIPT_DIR/Caddyfile --adapter caddyfile
ExecReload=/usr/bin/caddy reload --config $SCRIPT_DIR/Caddyfile --adapter caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

# Give caddy user permission to read the Caddyfile
echo "Setting permissions..."
chown -R caddy:caddy "$SCRIPT_DIR/Caddyfile"
chmod 644 "$SCRIPT_DIR/Caddyfile"

# Reload systemd and enable the service
echo "Enabling Caddy service..."
systemctl daemon-reload
systemctl enable caddy-balda.service

# Create a management script
echo "Creating management script..."
cat > "$SCRIPT_DIR/caddy_control.sh" << 'EOF'
#!/bin/bash

# Caddy management script for Balda Game API

case "$1" in
    start)
        echo "Starting Caddy proxy server..."
        sudo systemctl start caddy-balda
        echo "✓ Caddy started"
        ;;
    stop)
        echo "Stopping Caddy proxy server..."
        sudo systemctl stop caddy-balda
        echo "✓ Caddy stopped"
        ;;
    restart)
        echo "Restarting Caddy proxy server..."
        sudo systemctl restart caddy-balda
        echo "✓ Caddy restarted"
        ;;
    reload)
        echo "Reloading Caddy configuration..."
        sudo systemctl reload caddy-balda
        echo "✓ Caddy configuration reloaded"
        ;;
    status)
        echo "Caddy service status:"
        sudo systemctl status caddy-balda
        ;;
    logs)
        echo "Showing Caddy logs (press Ctrl+C to exit):"
        sudo journalctl -u caddy-balda -f
        ;;
    test)
        echo "Testing Caddy configuration..."
        sudo /usr/bin/caddy validate --config $(dirname "$0")/Caddyfile --adapter caddyfile
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reload|status|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Caddy proxy server"
        echo "  stop    - Stop Caddy proxy server"
        echo "  restart - Restart Caddy proxy server"
        echo "  reload  - Reload configuration without stopping"
        echo "  status  - Show service status"
        echo "  logs    - Show live logs"
        echo "  test    - Test configuration validity"
        exit 1
        ;;
esac
EOF

# Make the control script executable
chmod +x "$SCRIPT_DIR/caddy_control.sh"

# Test the configuration
echo "Testing Caddy configuration..."
/usr/bin/caddy validate --config "$SCRIPT_DIR/Caddyfile" --adapter caddyfile

# Start the service
echo "Starting Caddy service..."
systemctl start caddy-balda

echo ""
echo "🎉 Caddy proxy server setup complete!"
echo ""
echo "Configuration:"
echo "  - Domain: api.balda-game.com"
echo "  - Proxying to: localhost:8000 (your Vosk server)"
echo "  - SSL: Automatic (Let's Encrypt)"
echo "  - Service: caddy-balda"
echo ""
echo "Management commands:"
echo "  ./caddy_control.sh start    - Start proxy"
echo "  ./caddy_control.sh stop     - Stop proxy"
echo "  ./caddy_control.sh restart  - Restart proxy"
echo "  ./caddy_control.sh reload   - Reload config"
echo "  ./caddy_control.sh status   - Check status"
echo "  ./caddy_control.sh logs     - View logs"
echo "  ./caddy_control.sh test     - Test config"
echo ""
echo "Important notes:"
echo "  1. Ensure your domain api.balda-game.com points to this server's IP"
echo "  2. Ensure ports 80 and 443 are open in your firewall"
echo "  3. Start your Vosk server (./run.sh) before using the proxy"
echo "  4. SSL certificates will be obtained automatically on first request"
echo ""
echo "Service status:"
systemctl status caddy-balda --no-pager -l