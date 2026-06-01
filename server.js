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

    console.log("UID:", uid);
    console.log("Amount:", amount);
    console.log("Status:", status);
    console.log("TransID:", transId);

    if (status !== "1") {
      return res.send("Ignored");
    }

    const txRef = db.collection("transactions").doc(transId);
    const txDoc = await txRef.get();

    if (txDoc.exists) {
      return res.send("Already Processed");
    }

    const coins = Math.round(amount * 1000);

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        coins: 0,
        createdAt: Date.now()
      });
    }

    await userRef.update({
      coins: admin.firestore.FieldValue.increment(coins)
    });

    await txRef.set({
      uid,
      amount,
      coins,
      status,
      transId,
      createdAt: Date.now()
    });

    res.send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("ERROR");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server Running");
});
