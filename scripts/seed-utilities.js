const mongoose = require('mongoose');

const uri = "mongodb://gunjankv19_db_user:6uDF6AHNrBUEyf6T@ac-6gvj3yc-shard-00-00.xyuxmhb.mongodb.net:27017,ac-6gvj3yc-shard-00-01.xyuxmhb.mongodb.net:27017,ac-6gvj3yc-shard-00-02.xyuxmhb.mongodb.net:27017/monopoly?ssl=true&replicaSet=atlas-fr8bn2-shard-0&authSource=admin&retryWrites=true&w=majority";

const utilitiesToSeed = [
  {
    type: 'utility',
    name: 'electric company',
    buyingCost: 150,
    buildingCost: 0,
    baseRent: 10,
    rent1: 4,  // 4x dice
    rent2: 10, // 10x dice
    rent3: 0,
    rent4: 0,
    hotelRent: 0,
    mortgage: 75,
    color: '#0369a1',
    icon: '⚡',
  },
  {
    type: 'utility',
    name: 'waterworks',
    buyingCost: 150,
    buildingCost: 0,
    baseRent: 10,
    rent1: 4,  // 4x dice
    rent2: 10, // 10x dice
    rent3: 0,
    rent4: 0,
    hotelRent: 0,
    mortgage: 75,
    color: '#0284c7',
    icon: '💧',
  },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log("Connected successfully!");

    const collection = mongoose.connection.db.collection('properties');

    for (const util of utilitiesToSeed) {
      const existing = await collection.findOne({
        $or: [
          { name: util.name },
          { name: new RegExp(`^${util.name}$`, 'i') },
          { type: 'utility', name: { $regex: util.name.split(' ')[0], $options: 'i' } }
        ]
      });

      if (existing) {
        console.log(`Utility already exists: ${existing.name} (id: ${existing._id}) - Updating if needed`);
        await collection.updateOne(
          { _id: existing._id },
          {
            $set: {
              type: 'utility',
              buyingCost: util.buyingCost,
              mortgage: util.mortgage,
              icon: util.icon,
              color: util.color,
              updatedAt: new Date(),
            }
          }
        );
      } else {
        const result = await collection.insertOne({
          ...util,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        });
        console.log(`Inserted utility: ${util.name} (id: ${result.insertedId})`);
      }
    }

    const allProps = await collection.find({}).toArray();
    console.log(`Total properties in database now: ${allProps.length}`);
    const utils = allProps.filter(p => p.type === 'utility');
    console.log("Utilities in DB:", utils.map(u => ({ id: u._id, name: u.name, type: u.type, cost: u.buyingCost, mortgage: u.mortgage })));

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
