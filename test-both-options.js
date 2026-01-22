// test-both-options.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection(uri, name) {
    console.log(`\n🔗 Testing: ${name}`);
    console.log('URI:', uri.replace(/:([^:@]+)@/, ':****@'));
    
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log(`✅ ${name}: CONNECTED`);
        await mongoose.disconnect();
        return true;
    } catch (err) {
        console.log(`❌ ${name}: ${err.message}`);
        return false;
    }
}

(async () => {
    console.log('📊 Testing Both MongoDB Options');
    console.log('===============================');
    
    // Test MongoDB Atlas
    const atlasURI = 'mongodb+srv://Sreevani21_db_user:Vani%4021@cluster0.1wqqsy0.mongodb.net/cuk_event_hub?retryWrites=true&w=majority&appName=Cluster0';
    const atlasSuccess = await testConnection(atlasURI, 'MongoDB Atlas');
    
    // Test Local MongoDB
    const localURI = 'mongodb://localhost:27017/cuk_event_hub';
    const localSuccess = await testConnection(localURI, 'Local MongoDB');
    
    console.log('\n🎯 RECOMMENDATION:');
    if (localSuccess) {
        console.log('Use LOCAL MongoDB (already working)');
        console.log('Update .env: MONGODB_URI=mongodb://localhost:27017/cuk_event_hub');
    } else if (atlasSuccess) {
        console.log('Use MONGODB ATLAS');
    } else {
        console.log('Install Local MongoDB:');
        console.log('1. Download: https://www.mongodb.com/try/download/community');
        console.log('2. Install → Create C:\\data\\db → net start MongoDB');
    }
})();