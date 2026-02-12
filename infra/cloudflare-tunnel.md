# Cloudflare Tunnel Setup

1. Install `cloudflared` on the Windows desktop or NAS host.
2. Authenticate:
   - `cloudflared tunnel login`
3. Create a tunnel:
   - `cloudflared tunnel create clipsync`
4. Route a hostname to the tunnel:
   - `cloudflared tunnel route dns clipsync clipsync.yourdomain.com`
5. Create a config file at `~/.cloudflared/config.yml`:

```yaml
url: http://localhost:5000
tunnel: <tunnel-id>
credentials-file: /path/to/<tunnel-id>.json

ingress:
  - hostname: clipsync.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
```

6. Run the tunnel:
   - `cloudflared tunnel run clipsync`

Optional:
- Add the tunnel as a Windows service with `cloudflared service install`.
- Set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` if you want the server to expose status in Settings.
