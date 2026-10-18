const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Yeh line check karegi ke link kon sa load ho raha hai (sirf shuru ka hissa dikhayegi security ke liye)
        console.log(`[Debug] Trying to connect to: ${process.env.MONGO_URI.split('@')[1] || 'Localhost'}`);

        // Naye Mongoose mein options ki zaroorat nahi hoti, is liye warnings hat jayengi
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`[MongoDB] Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB] Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;