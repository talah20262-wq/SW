const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات (MongoDB)
mongoose.connect('mongodb+srv://admin:22422@cluster0.mongodb.net/TallaPlatform')
    .then(() => console.log("Platform Online!"))
    .catch(err => console.error("Database Connection Failed"));

// نموذج المتجر
const StoreSchema = new mongoose.Schema({
    storeName: String,
    subdomain: { type: String, unique: true },
    ownerEmail: String,
    plan: { type: String, default: 'Free' }, // Free or VIP
    isVerified: { type: Boolean, default: false },
    status: { type: String, default: 'Active' }
});

const Store = mongoose.model('Store', StoreSchema);

// مسار المالك (Admin Only) - جلب كل المتاجر
app.get('/api/admin/stores', async (req, res) => {
    const auth = req.headers.authorization;
    if (auth === '22422') {
        const stores = await Store.find();
        res.json(stores);
    } else {
        res.status(403).send("Unauthorized Access");
    }
});

// إنشاء متجر جديد
app.post('/api/stores/create', async (req, res) => {
    try {
        const store = new Store(req.body);
        await store.save();
        res.status(201).json({ success: true, url: `${req.body.subdomain}.talla.com` });
    } catch (err) {
        res.status(400).json({ success: false, message: "Subdomain already exists" });
    }
});

app.listen(3000, () => console.log("Server Running on Port 3000"));
