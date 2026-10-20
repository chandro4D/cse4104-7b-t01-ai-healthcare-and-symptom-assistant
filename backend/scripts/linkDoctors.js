// ONE-TIME MIGRATION: links every existing doctor account to a Doctor profile.
//
//   node scripts/linkDoctors.js --dry         (preview only, changes nothing)
//   node scripts/linkDoctors.js               (link + create missing profiles)
//   node scripts/linkDoctors.js --no-create   (link only, never create)
//
// Run it from the backend root folder (where server.js is).

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User.model");
const {
  findExistingDoctor,
  linkUserToDoctor,
  createProfile,
  hasPath,
} = require("../utils/ensureDoctorProfile");

const DRY = process.argv.includes("--dry");
const CREATE = !process.argv.includes("--no-create");

(async () => {
  try {
    await connectDB();

    const users = await User.find({ role: "doctor" });
    console.log(
      `\nFound ${users.length} doctor account(s). ${DRY ? "(DRY RUN)" : ""}\n`,
    );

    const tally = { ok: 0, linked: 0, created: 0, missing: 0 };

    for (const user of users) {
      const label = `${user.name} <${user.email}>`;
      const doctor = await findExistingDoctor(user, { matchByName: true });

      if (doctor) {
        const alreadyOk =
          String(user.doctorId || "") === String(doctor._id) &&
          (!hasPath("user") || String(doctor.user || "") === String(user._id));

        if (alreadyOk) {
          tally.ok++;
          console.log(`✔ already linked   ${label}`);
        } else {
          if (!DRY) await linkUserToDoctor(user, doctor);
          tally.linked++;
          console.log(
            `🔗 ${DRY ? "would link" : "linked"}          ${label} -> doctor ${doctor._id} (${doctor.name})`,
          );
        }
        continue;
      }

      if (!CREATE) {
        tally.missing++;
        console.log(`⚠ no Doctor profile ${label}`);
        continue;
      }

      if (DRY) {
        tally.created++;
        console.log(`➕ would create    ${label}`);
        continue;
      }

      const created = await createProfile(user);
      await linkUserToDoctor(user, created);
      tally.created++;
      console.log(`➕ created profile ${label} -> doctor ${created._id}`);
    }

    console.log("\nSummary:", tally, "\n");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
