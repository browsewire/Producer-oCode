# Producer PM2 Production Deployment

## Quick Start

### Start the producer with PM2:
```bash
pm2 start ecosystem.config.json
```

### View status:
```bash
pm2 status
pm2 logs producer
```

### Stop the producer:
```bash
pm2 stop producer
```

### Restart the producer:
```bash
pm2 restart producer
```

### Auto-start on system boot:
```bash
pm2 startup
pm2 save
```

## Configuration

Edit `ecosystem.config.json` to change environment variables for production:
- `MAG_NAME`: Set to your production magento name (e.g., 'www', 'm2-staging')
- `NAMESPACE`: Set to your production namespace
- `PRODUCER_NAME`: Set to your production producer name
- Other environment variables as needed

## Access

Once running, access the producer at:
**http://localhost:8080** or **http://your-server-ip:8080**

## TLX Build

1. Open the producer UI
2. Select **TLX** radio button
3. Click **"Run Export"**
4. Build will run in `/var/www/html/Luxraytime`

## Logs

- Error logs: `/tmp/producer-error.log`
- Output logs: `/tmp/producer-out.log`
- View live: `pm2 logs producer`

## Notes

- Producer runs on port 8080
- Builds run with sudo/root permissions
- No auto-refresh (disabled for stability)
- All TLX builds output to `/var/www/html/Luxraytime`
