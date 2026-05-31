const express = require("express");
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(
  fs.readFileSync("/etc/secrets/serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.get("/", (req, res) => {
  res.send("GTask PRO CPX Postback Running");
});

app.get("/cpx-postback", async (req, res) => {
  try {
    const uid = req.query.user_id;
    const amount = Number(req.query.amount_usd || 0);
    const status = req.query.status;
    const transId = req.query.trans_id;

    if (status !== "1") {
      return res.send("Ignored");
    }

    const txRef = db.collection("transactions").doc(transId);
    const txDoc = await txRef.get();

    if (txDoc.exists) {
      return res.send("Already Processed");
    }

    const coins = Math.round(amount * 1000);

    await db.collection("users").doc(uid).update({
      coins: admin.firestore.FieldValue.increment(coins)
    });

    await txRef.set({
      uid,
      amount,
      coins,
      createdAt: Date.now()
    });

    res.send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("ERROR");
  }
});

app.listen(process.env.PORT || 3000);
