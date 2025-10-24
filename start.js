#!/usr/bin/env node

// Production startup script for PM2
// Sets all required environment variables and starts the producer

process.env.MAG_NAME = process.env.MAG_NAME || 'local';
process.env.NAMESPACE = process.env.NAMESPACE || 'local';
process.env.PORT_DN = process.env.PORT_DN || '3001';
process.env.PORT_SERVE_DN = process.env.PORT_SERVE_DN || '8001';
process.env.PORT_TF = process.env.PORT_TF || '3002';
process.env.PORT_SERVE_TF = process.env.PORT_SERVE_TF || '8002';
process.env.PORT_FA = process.env.PORT_FA || '3003';
process.env.PORT_SERVE_FA = process.env.PORT_SERVE_FA || '8003';
process.env.PRODUCER_NAME = process.env.PRODUCER_NAME || 'local-producer';
process.env.WP_NAME = process.env.WP_NAME || 'local-wp';

// Start the producer application
require('./src/index.js');
