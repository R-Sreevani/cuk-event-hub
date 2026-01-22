// test-connection-fixed.js
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔗 Testing MongoDB Atlas Connection...');

// Use YOUR password (replace YOUR_PASSWORD)
const uri = 'mongodb+srv://Sreevani21_db_user:YOUR_PASSWORD@cluster0.1wqqsy0.mongodb.net/cuk_event_hub?retryWrites=true&w=majority&appName=Cluster0';

console.log('URI:', uri.replace(/:[^:@]*@/, ':****@')); // Hide password in logs

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000
})
.then(() => {
    console.log('\n✅ SUCCESS: MongoDB Atlas Connected!');
    console.log('👤 User: Sreevani21_db_user');
    console.log('💾 Database: cuk_event_hub');
    console.log('🔒 Connection established');
    
    // List collections
    mongoose.connection.db.listCollections().toArray((err, collections) => {
        console.log('\n📁 Collections:', collections.length);
        collections.forEach(col => console.log('  -', col.name));
        process.exit(0);
    });
})
.catch(err => {
    console.log('\n❌ CONNECTION FAILED:', err.message);
    console.log('\n🔧 STEP-BY-STEP FIX:');
    console.log('1. Go to: https://cloud.mongodb.com/v2#/security/network/accessList');
    console.log('2. Click "ADD IP ADDRESS"');
    console.log('3. Enter: 0.0.0.0/0 (allow from anywhere)');
    console.log('4. Click "Confirm"');
    console.log('5. Wait 2 minutes');
    console.log('6. Try again');
    console.log('\n💡 Alternative: Use local MongoDB instead');
    console.log('   Change URI to: mongodb://localhost:27017/cuk_event_hub');
    process.exit(1);
});