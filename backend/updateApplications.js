// updateApplications.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Application } from "./models/applicationSchema.js"; // عدل المسار حسب مشروعك

dotenv.config({ path: "./config/config.env" });

const dbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/yourDB";

async function updateApplications() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB.");

    // تحديث أي تطبيق بدون status أو بقيمة خاطئة
    const allowedStatus = ["Pending", "Accepted", "Rejected"];
    const result1 = await Application.updateMany(
      { status: { $nin: allowedStatus } },
      { $set: { status: "Pending" } }
    );
    console.log(`Updated ${result1.modifiedCount} applications with invalid status.`);

    // التأكد من وجود applicantID.user و employerID.user
    const incompleteApps = await Application.find({
      $or: [
        { "applicantID.user": { $exists: false } },
        { "employerID.user": { $exists: false } },
      ],
    });

    if (incompleteApps.length > 0) {
      console.log("Applications with missing IDs:");
      incompleteApps.forEach((app) => {
        console.log(`- Application ID: ${app._id}`);
      });
    } else {
      console.log("All applications have valid applicantID.user and employerID.user.");
    }

    console.log("Database update completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error updating applications:", error);
    process.exit(1);
  }
}

updateApplications();
