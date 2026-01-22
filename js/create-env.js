const fs = require('fs');
const crypto = require('crypto');

// Generate random JWT secret
const jwtSecret = crypto.randomBytes(32).toString('hex');

const envContent = `# CUK Event Hub Environment Variables
# Generated on: ${new Date().toISOString()}

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/cuk_event_hub

# JWT Secret Key (Auto-generated)
JWT_SECRET=${jwtSecret}

# Server Port
PORT=5000

# Email Configuration (Optional - Comment out if not using email)
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
`;

fs.writeFileSync('.env', envContent);
console.log('✅ .env file created successfully!');
console.log('📋 JWT Secret generated:', jwtSecret);