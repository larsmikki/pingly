# Pingly

![screenshot](screenshot.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-larsmikki%2Fpingly-blue?logo=docker)](https://hub.docker.com/r/larsmikki/pingly)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-larsmikki%2Fpingly-blue?logo=github)](https://github.com/larsmikki/pingly/pkgs/container/pingly)
[![Node 20](https://img.shields.io/badge/Node-20-brightgreen?logo=node.js)](https://nodejs.org/)

**Pingly** is a self-hosted uptime monitor. Add URLs, set check intervals, and get an instant view of what's up and what's down — no accounts, no cloud, runs in a single Docker container.

## Features

- Monitor any HTTP/HTTPS URL with HEAD or GET requests
- Configurable check intervals from 1 minute to 24 hours
- Up/down/error status with response time display
- Down event alerts with dismiss support
- Per-monitor history log with status codes and response times
- Auto-fetched favicons for each monitored site
- Search and filter your monitors
- Enable or disable individual monitors
- Manual "check now" trigger per monitor
- Import and export monitors as JSON
- Bulk interval update across all monitors
- Log cleanup to trim old history
- Multiple built-in themes (light and dark)
- SQLite — no external database required

## Requirements

- Docker and Docker Compose

## Docker setup

### Quick start

```bash
docker run -d \
  --name pingly \
  -p 3040:3040 \
  -v pingly-data:/app/data \
  --restart unless-stopped \
  larsmikki/pingly:latest
```

Then open [http://localhost:3040](http://localhost:3040).

### Docker Compose (recommended)

```yaml
services:
  pingly:
    image: larsmikki/pingly:latest
    container_name: pingly
    ports:
      - "3040:3040"
    volumes:
      - pingly-data:/app/data
    restart: unless-stopped

volumes:
  pingly-data:
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3040` | Port the server listens on |
| `DATA_DIR` | `/app/data` | Directory for the SQLite database |

## Usage

| Action | How |
|--------|-----|
| Add a monitor | Click **Add Monitor** |
| Edit a monitor | Click the monitor card, then the edit icon |
| Pause a monitor | Toggle the enable switch in the edit dialog |
| Check immediately | Hover a card and click the refresh icon |
| Import monitors | **Settings → Import** |
| Export monitors | **Settings → Export** |
| Change theme | **Settings → Themes** |

## Data

All data is stored in a single SQLite file inside the Docker volume:

```
/app/data/
  pingly.db    # monitors, check logs, and settings
```

## License

[MIT](LICENSE)

## Support

If Pingly saves you time, consider [buying me a coffee](https://buymeacoffee.com/larsmikki) or [donating via PayPal](https://paypal.me/larsmikki). It helps keep the project free and maintained.
