const express = require('express');
const axios = require('axios');
const db = require('./firebase');

const app = express();
app.use(express.json());

const SOURCE_API_URL = process.env.SOURCE_API_URL || "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";
const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || "results";

// স্ট্যাটাস চেক রুট
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "Vercel Auto Proxy Collector",
    firestore: db ? "connected" : "disconnected",
    time: new Date().toISOString()
  });
});

// ডেটা ফেচ এবং সেভ করার ফাংশন (corsproxy.io সহ আপডেট করা)
async function fetchAndSaveData() {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(SOURCE_API_URL)}`;
    const response = await axios.get(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    const records = data.data?.list || data.list || data;

    if (Array.isArray(records) && records.length > 0) {
      const batch = db.batch();
      
      records.forEach((item) => {
        const docRef = db.collection(COLLECTION_NAME).doc(String(item.issueNumber || item.period || Date.now()));
        batch.set(docRef, { ...item, savedAt: new Date().toISOString() }, { merge: true });
      });

      await batch.commit();
      console.log(`Successfully saved ${records.length} items to Firestore.`);
    } else {
      console.log("No records found in API response:", data);
    }
  } catch (error) {
    console.error("Error fetching or saving data:", error.message);
  }
}

// ম্যানুয়ালি বা ক্রন জব দিয়ে ট্রিগার করার এন্ডপয়েন্ট
app.get('/api/collect', async (req, res) => {
  await fetchAndSaveData();
  res.json({ success: true, message: "Collection triggered successfully!" });
});

// ফায়ারস্টোর থেকে ডেটা দেখার এন্ডপয়েন্ট
app.get('/api/results', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).orderBy('savedAt', 'desc').limit(20).get();
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: results });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// লোকাল টেস্টের জন্য
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

module.exports = app;
