// ONE-TIME: existing doctors (created before verification existed) are
// treated as already approved so the site keeps working.
//
//   node scripts/migrateVerification.js --dry     (preview)
//   node scripts/migrateVerification.js           (apply)

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Doctor = require("../models/Doctor.model");

const DRY = process.argv.includes("--dry");

(async () => {
  try {
    await connectDB();
    const filter = { verificationStatus: { $exists: false } };
    const count = await Doctor.countDocuments(filter);
    console.log(
      `${count} doctor(s) have no verificationStatus. ${DRY ? "(DRY RUN)" : ""}`,
    );

    if (!DRY && count > 0) {
      const res = await Doctor.updateMany(filter, {
        $set: {
          verificationStatus: "Approved",
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
      console.log(`Updated ${res.modifiedCount} doctor(s) to Approved.`);
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
