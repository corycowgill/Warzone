# Warzone Deployment Guide

How to host the Warzone multiplayer RTS game online. The game is a pure HTML/CSS/JS app with a Node.js WebSocket server -- no build step, no database.

**Requirements:**
- Node.js 18+ (20 recommended)
- The `ws` npm package (only production dependency)
- WebSocket support on the hosting platform
- HTTPS/SSL for production (required for WebRTC voice chat)

**Architecture:**
- `server-multiplayer.cjs` serves static files AND runs the WebSocket server on the same port
- The client auto-detects `ws://` vs `wss://` based on page protocol
- Three.js is loaded from CDN (no bundling needed)
- 3D models (.glb) and audio files are in `assets/`
- The server respects `PORT` env var (defaults to 8000)

---

## Option 1: Render.com (Free tier, simplest)

**Cost:** Free (750 hours/month) | **Best for:** Testing, demos, small audience

### Steps

1. Push your code to a GitHub repository.

2. Go to [render.com](https://render.com) and sign in with GitHub.

3. Click **New > Web Service**.

4. Connect your GitHub repo.

5. Configure the service:
   - **Name:** `warzone`
   - **Region:** Pick the closest to your players
   - **Runtime:** Node
   - **Build Command:** `npm install --production`
   - **Start Command:** `node server-multiplayer.cjs`
   - **Instance Type:** Free

6. Under **Environment**, add:
   - `NODE_ENV` = `production`
   - (PORT is automatically set by Render)

7. Click **Create Web Service**. Render will build and deploy.

8. Your game will be at `https://warzone-xxxx.onrender.com`.

### WebSocket Configuration

Render supports WebSocket out of the box on Web Services. No special config needed -- the same port serves both HTTP and WS.

### Custom Domain

1. Go to your service **Settings > Custom Domains**.
2. Add your domain (e.g., `play.warzone.com`).
3. Add the CNAME record Render provides to your DNS.
4. SSL is automatic via Let's Encrypt.

### Pros/Cons

| Pros | Cons |
|------|------|
| Zero config, free | Sleeps after 15min inactivity |
| Automatic HTTPS | ~30s cold start when waking |
| Auto-deploy from GitHub | 512MB RAM on free tier |
| No credit card required | WebSocket connections drop on sleep |

### Blueprint (Infrastructure as Code)

You can also deploy using the included `render.yaml` file:
1. Go to [render.com/blueprints](https://render.com/blueprints)
2. Connect your repo
3. Render reads `render.yaml` and creates the service automatically

---

## Option 2: Railway.app (Simple, $5/mo)

**Cost:** ~$5/month (usage-based, $5 credit included) | **Best for:** Always-on with minimal config

### Steps

1. Push your code to GitHub.

2. Go to [railway.app](https://railway.app) and sign in with GitHub.

3. Click **New Project > Deploy from GitHub Repo**.

4. Select your repo.

5. Railway auto-detects Node.js. Verify these settings in **Settings**:
   - **Build Command:** `npm install --production`
   - **Start Command:** `node server-multiplayer.cjs`

6. Under **Variables**, add:
   - `NODE_ENV` = `production`
   - Railway sets `PORT` automatically -- the server reads it.

7. Go to **Settings > Networking > Generate Domain** to get a public URL.

8. Your game will be at `https://warzone-production-xxxx.up.railway.app`.

### WebSocket Configuration

Railway supports WebSocket natively. No additional config needed.

### Custom Domain

1. In your service, go to **Settings > Networking > Custom Domain**.
2. Add your domain and configure DNS as instructed.
3. SSL is automatic.

### Pros/Cons

| Pros | Cons |
|------|------|
| Always on (no sleeping) | Costs ~$5/month |
| Fast deploys (~30 seconds) | Usage-based billing can vary |
| WebSocket works immediately | Less global distribution |
| Nice dashboard and logs | |

---

## Option 3: Fly.io (Free tier, global edge)

**Cost:** Free tier available (3 shared VMs) | **Best for:** Low latency, global player base

### Steps

1. Install the Fly CLI:
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows
   powershell -Command "irm https://fly.io/install.ps1 | iex"
   ```

2. Sign up and log in:
   ```bash
   fly auth signup
   # or
   fly auth login
   ```

3. From the project root (where `fly.toml` is), launch the app:
   ```bash
   fly launch
   ```
   - It will detect the `fly.toml` and `Dockerfile`.
   - Choose a region close to your players (e.g., `iad` for US East, `lhr` for Europe).
   - Say **yes** to deploy now.

4. Your game will be at `https://warzone.fly.dev` (or your chosen app name).

### WebSocket Configuration

The included `fly.toml` is already configured for WebSocket support. Key settings:
- `force_https = true` ensures `wss://` connections
- The internal port 8000 is mapped to the public HTTPS port
- No special proxy headers needed -- Fly passes WebSocket upgrades through

### Scaling to Multiple Regions

```bash
# Add a region (e.g., Amsterdam)
fly regions add ams

# Scale to 2 machines
fly scale count 2
```

Note: Each Fly machine runs its own server with its own rooms. Players must connect to the same machine. For true multi-region, you would need a shared state layer (Redis, etc.), which is beyond this guide.

### Custom Domain

```bash
fly certs add play.warzone.com
```
Then add the CNAME/A records Fly provides to your DNS.

### Pros/Cons

| Pros | Cons |
|------|------|
| Global edge deployment | CLI-based workflow |
| Free tier (3 shared VMs) | Multi-region = separate game states |
| Low latency | Slightly more complex setup |
| Automatic HTTPS | Free tier has limited resources |
| Docker-based, reproducible | |

---

## Option 4: VPS (DigitalOcean/Linode/Hetzner) -- RECOMMENDED

**Cost:** $4-6/month | **Best for:** Serious hosting, full control, best performance

This is the recommended option for a production deployment. You get full control over the server, predictable pricing, and the best performance for WebSocket connections.

### Step 1: Create a VPS

**DigitalOcean:**
1. Go to [digitalocean.com](https://digitalocean.com), create an account.
2. Create a Droplet: Ubuntu 22.04, $4/mo (512MB) or $6/mo (1GB).
3. Choose a datacenter close to your players.
4. Add your SSH key.

**Linode (Akamai):**
1. Go to [linode.com](https://linode.com), create a Linode.
2. Ubuntu 22.04, Nanode $5/mo (1GB RAM).

**Hetzner (cheapest):**
1. Go to [hetzner.com/cloud](https://hetzner.com/cloud).
2. Ubuntu 22.04, CX22 ~$4/mo (2GB RAM).

### Step 2: Initial Server Setup

SSH into your server:

```bash
ssh root@YOUR_SERVER_IP
```

Secure the server and install Node.js:

```bash
# Update system
apt update && apt upgrade -y

# Create a non-root user
adduser warzone
usermod -aG sudo warzone

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install nginx and certbot
apt install -y nginx certbot python3-certbot-nginx

# Enable firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Step 3: Deploy the Game

```bash
# Switch to the warzone user
su - warzone

# Clone your repo
git clone https://github.com/YOUR_USERNAME/warzone.git ~/warzone
cd ~/warzone

# Install production dependencies
npm install --production

# Test it works
node server-multiplayer.cjs
# Visit http://YOUR_SERVER_IP:8000 -- press Ctrl+C to stop
```

### Step 4: Set Up systemd Service

Create the service file:

```bash
sudo nano /etc/systemd/system/warzone.service
```

Paste this content (or use the included `warzone.service.example`):

```ini
[Unit]
Description=Warzone Multiplayer Server
After=network.target

[Service]
Type=simple
User=warzone
WorkingDirectory=/home/warzone/warzone
ExecStart=/usr/bin/node server-multiplayer.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8000

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/warzone/warzone

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=warzone

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable warzone
sudo systemctl start warzone

# Check status
sudo systemctl status warzone

# View logs
sudo journalctl -u warzone -f
```

### Step 5: Configure nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/warzone
```

Paste this (or use the included `nginx.conf.example`):

```nginx
upstream warzone_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

server {
    listen 80;
    server_name play.warzone.com;  # Replace with your domain

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name play.warzone.com;  # Replace with your domain

    # SSL certs (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/play.warzone.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/play.warzone.com/privkey.pem;

    # WebSocket support
    location / {
        proxy_pass http://warzone_backend;
        proxy_http_version 1.1;

        # These headers enable WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-lived WebSocket connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Cache static assets aggressively
    location ~* \.(glb|gltf|png|jpg|svg|mp3|ogg|wav|woff2?)$ {
        proxy_pass http://warzone_backend;
        proxy_set_header Host $host;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/warzone /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

### Step 6: SSL with Let's Encrypt

Point your domain's DNS A record to your server IP first, then:

```bash
sudo certbot --nginx -d play.warzone.com
```

Certbot will:
- Obtain a certificate
- Update your nginx config with the correct paths
- Set up auto-renewal (cron job)

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

### Step 7: Updating the Game

```bash
cd ~/warzone
git pull
sudo systemctl restart warzone
```

Or set up a simple deploy script:

```bash
#!/bin/bash
# ~/deploy.sh
cd ~/warzone
git pull origin main
npm install --production
sudo systemctl restart warzone
echo "Deployed at $(date)"
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Full control | Requires server administration |
| Best WebSocket performance | Manual SSL setup (but certbot helps) |
| Predictable cost ($4-6/mo) | Manual updates and monitoring |
| No cold starts | You handle backups and security |
| Can add monitoring, logs, etc. | |

---

## Option 5: Quick Sharing with ngrok (Free)

**Cost:** Free | **Best for:** Testing with friends, not production

### Steps

1. Install ngrok:
   ```bash
   # macOS
   brew install ngrok

   # Windows (with chocolatey)
   choco install ngrok

   # Or download from https://ngrok.com/download
   ```

2. Sign up at [ngrok.com](https://ngrok.com) and add your auth token:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

3. Start the game server locally:
   ```bash
   node server-multiplayer.cjs
   ```

4. In another terminal, tunnel it:
   ```bash
   ngrok http 8000
   ```

5. ngrok gives you a URL like `https://abc123.ngrok-free.app`. Share this with friends.

### Important Notes

- The URL changes every time you restart ngrok (unless you pay for a fixed subdomain).
- Free tier shows an ngrok interstitial page on first visit -- visitors must click through.
- HTTPS is provided automatically, so WebRTC voice chat will work.
- Performance depends on your local internet connection.
- Not suitable for more than a few players.

### Alternatives to ngrok

- **Cloudflare Tunnel** (free, no interstitial): `cloudflared tunnel --url http://localhost:8000`
- **localtunnel**: `npx localtunnel --port 8000`
- **Tailscale** (free, mesh VPN): Share your machine directly with friends on a private network.

### Pros/Cons

| Pros | Cons |
|------|------|
| Zero deployment needed | URL changes on restart |
| Works in 30 seconds | Free tier has interstitial |
| HTTPS included | Depends on your internet |
| Great for playtesting | Not for production |

---

## WebSocket Checklist (All Platforms)

WebSocket connections are the backbone of multiplayer. Here is what to verify on any platform:

1. **Protocol:** The client (`NetworkManager.js`) auto-detects `ws://` vs `wss://` based on page protocol. If the page loads over HTTPS, it uses `wss://`. This is already handled correctly.

2. **Same port:** The game serves HTTP and WebSocket on the same port. No separate WebSocket port needed.

3. **Proxy headers:** If behind a reverse proxy (nginx, Cloudflare, etc.), ensure these headers are set:
   ```
   Upgrade: $http_upgrade
   Connection: "upgrade"
   ```

4. **Timeouts:** WebSocket connections are long-lived. Set proxy read timeout to at least 86400s (24 hours). The server sends ping/pong heartbeats every 5 seconds to keep connections alive.

5. **SSL/HTTPS:** Required for production because:
   - WebRTC `getUserMedia()` (voice chat) requires a secure context
   - Mixed content rules block `ws://` connections from `https://` pages
   - All recommended platforms provide free SSL

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | HTTP/WebSocket server port |
| `NODE_ENV` | `development` | Set to `production` in deployment |

See `.env.example` for a template.

## Deployment Config Files

The following config files are included in this repo:

| File | Purpose |
|------|---------|
| `Dockerfile` | Container image for Fly.io, Railway, or any Docker host |
| `fly.toml` | Fly.io deployment config |
| `render.yaml` | Render.com blueprint |
| `nginx.conf.example` | nginx reverse proxy config for VPS |
| `.env.example` | Environment variable template |

## Monitoring in Production

For a VPS deployment, useful monitoring commands:

```bash
# Server status
sudo systemctl status warzone

# Live logs
sudo journalctl -u warzone -f

# Active game rooms (hit the API)
curl https://play.warzone.com/api/status

# Check WebSocket connections
curl https://play.warzone.com/api/rooms

# Resource usage
htop
```

For cloud platforms (Render, Railway, Fly), use their built-in dashboards and log viewers.
