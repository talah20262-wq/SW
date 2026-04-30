const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// الإعدادات التي استخرجناها من الصور السابقة
const CLOUDFLARE_TOKEN = "cfut_Y73viPEzQac4kWy2HCZk3cNufYX0wmpLXSxldyNJcf33839d"; //
const SERVER_IP = "45.243.217.191"; //
const ZONE_ID = "ضع_هنا_Zone_ID_الخاص_بدومين_طلة"; 

// الاتصال بقاعدة البيانات MongoDB
mongoose.connect('mongodb://localhost:27017/TallaPlatform')
    .then(() => console.log("Database Online!"))
    .catch(err => console.error("Database Error", err));

// تعريف هيكل المتجر في قاعدة البيانات
const StoreSchema = new mongoose.Schema({
    storeName: String,
    subdomain: { type: String, unique: true },
    plan: { type: String, default: 'Free' },
    isVerified: { type: Boolean, default: false },
    ownerEmail: String
});
const Store = mongoose.model('Store', StoreSchema);

// وظيفة الربط التلقائي بـ Cloudflare
async function createDNS(subdomain) {
    try {
        await axios.post(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
            type: "A",
            name: subdomain,
            content: SERVER_IP,
            ttl: 1,
            proxied: true
        }, {
            headers: { 'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`, 'Content-Type': 'application/json' }
        });
        return true;
    } catch (error) {
        return false;
    }
}

// إنشاء متجر جديد
app.post('/api/stores/create', async (req, res) => {
    const dnsSuccess = await createDNS(req.body.subdomain);
    if (dnsSuccess) {
        const store = new Store(req.body);
        await store.save();
        res.json({ success: true, url: `${req.body.subdomain}.talla.com` });
    } else {
        res.status(500).json({ success: false, message: "DNS Error" });
    }
});

// لوحة تحكم المالك - عرض كل المتاجر
app.get('/api/admin/stores', async (req, res) => {
    if (req.headers.authorization === '22422') { //
        const stores = await Store.find();
        res.json(stores);
    } else {
        res.status(403).send("Unauthorized");
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
