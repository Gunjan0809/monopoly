const mongoose = require('mongoose');

const uri = "mongodb://gunjankv19_db_user:6uDF6AHNrBUEyf6T@ac-6gvj3yc-shard-00-00.xyuxmhb.mongodb.net:27017,ac-6gvj3yc-shard-00-01.xyuxmhb.mongodb.net:27017,ac-6gvj3yc-shard-00-02.xyuxmhb.mongodb.net:27017/monopoly?ssl=true&replicaSet=atlas-fr8bn2-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    console.log("Attempting to connect to MongoDB (direct connection)...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("SUCCESS! Connected to MongoDB!");
    
    // Quick test: list collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    process.exit(0);
  } catch (err) {
    console.error("Connection error:", err.message);
    process.exit(1);
  }
}

run();
