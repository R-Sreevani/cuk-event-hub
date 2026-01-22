// test-final.js
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔗 Final MongoDB Atlas Test');
console.log('===========================');

// Check if .env is loaded
console.log('📁 Environment check:');
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- MONGODB_URI exists?', !!process.env.MONGODB_URI);

if (process.env.MONGODB_URI) {
    // Hide password in log
    const safeURI = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log('- MONGODB_URI:', safeURI);
    
    // Test connection
    console.log('\n🔌 Testing connection...');
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    })
    .then(() => {
        console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
        console.log('💾 Database:', mongoose.connection.db.databaseName);
        console.log('👤 User: Sreevani21_db_user');
        process.exit(0);
    })
    .catch(err => {
        console.log('❌ FAILED:', err.message);
        
        if (err.message.includes('ECONNREFUSED')) {
            console.log('\n🔧 IP NOT WHITELISTED!');
            console.log('Go to: https://cloud.mongodb.com/v2#/security/network/accessList');
            console.log('Click "ADD IP ADDRESS"');
            console.log('Enter: 0.0.0.0/0');
            console.log('Click "Confirm"');
            console.log('Wait 2 minutes');
        } else if (err.message.includes('authentication')) {
            console.log('\n🔧 AUTHENTICATION FAILED!');
            console.log('Check:');
            console.log('1. Password: Vani@21 (encoded as Vani%4021)');
            console.log('2. Username: Sreevani21_db_user');
            console.log('3. Special characters in password need URL encoding');
        }
        process.exit(1);
    });
} else {
    console.log('❌ MONGODB_URI is undefined!');
    console.log('Check .env file format.');
    process.exit(1);
}