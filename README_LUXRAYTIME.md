# Luxraytime Build Configuration

This producer has been configured to run builds for the Luxraytime project on beta.timeluxury.com.

## Usage

### Via Producer Web UI

1. Start the producer: `npm start`
2. Open http://localhost:8080 in your browser
3. Trigger a build using the URL format:
   ```
   http://localhost:8080/?task={"siteId":"luxraytime","cmd":"buildLuxraytime","buildType":"npm","key":"buildLux123","page":1,"totalPages":1,"data":[]}
   ```

### Via Deploy Script

Run the deploy script to trigger a build:
```bash
./deploy.sh
```

Or with a custom producer URL:
```bash
PRODUCER_URL=http://your-producer-url:8080 ./deploy.sh
```

### Via Direct API Call

Trigger different build types:

#### NPM Build (default)
```bash
curl 'http://localhost:8080/?task={"siteId":"luxraytime","cmd":"buildLuxraytime","buildType":"npm","key":"buildLux001","page":1,"totalPages":1,"data":[]}'
```

#### Git Pull + Build
```bash
curl 'http://localhost:8080/?task={"siteId":"luxraytime","cmd":"buildLuxraytime","buildType":"git","key":"buildLux002","page":1,"totalPages":1,"data":[]}'
```

#### Custom Command
```bash
curl 'http://localhost:8080/?task={"siteId":"luxraytime","cmd":"buildLuxraytime","buildType":"custom","customCmd":"yarn install && yarn build","key":"buildLux003","page":1,"totalPages":1,"data":[]}'
```

## Build Configuration

The build runs in `/var/www/html/Luxraytime` on beta.timeluxury.com.

### Build Types

- **npm**: Runs `npm install && npm run build`
- **git**: Runs `git pull origin main && npm install && npm run build`
- **custom**: Runs your custom command (specify with `customCmd` parameter)

### Requirements

- The producer must have appropriate permissions to write to `/var/www/html/Luxraytime`
- Node.js and npm must be installed on the server
- If using git build type, the project must be a git repository

## Monitoring

Check build status on the producer dashboard at http://localhost:8080 (or your configured producer URL).
