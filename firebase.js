const admin = require("firebase-admin");

let serviceAccount;

try {
  // ভার্সেলের এনভায়রমেন্ট ভ্যারিয়েবল থেকে জেসন রিড করে \n এর সমস্যা দূর করার জন্য
  const rawConfig = process.env.FIREBASE_CONFIG_JSON;
  serviceAccount = JSON.parse(rawConfig.replace(/\\n/g, '\n'));
} catch (error) {
  console.error("Firebase JSON Parse Error:", error.message);
}

// ফায়ারবেস অ্যাপ ইনিশিয়ালাইজ করা
if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { admin, db };
