// المحرك الأساسي للمنصة - server.js
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// مفاتيح الربط التي تم استخراجها (Cloudflare API)
const CLOUDFLARE_TOKEN = "cfut_Y73viPEzQac4kWy2HCZk3cNufYX0wmpLXSxldyNJcf33839d"; //
const SERVER_IP = "45.243.217.191"; //
const ZONE_ID = "ضع_هنا_Zone_ID_الخاص_بك"; // تجده في صفحة الدومين الرئيسية في Cloudflare

// الاتصال بقاعدة البيانات MongoDB
mongoose.connect('mongodb://localhost:27017/TallaPlatform')
    .then(() => console.log("تم الاتصال بقاعدة البيانات بنجاح!"))
    .catch(err => console.error("فشل الاتصال:", err));

// هيكل قاعدة البيانات للمتاجر
const StoreSchema = new mongoose.Schema({
    storeName: String,
    subdomain: { type: String, unique: true },
    ownerEmail: String,
    plan: { type: String, default: 'Free' }, // Free أو VIP
    isVerified: { type: Boolean, default: false }, // علامة التوثيق ✔
    status: { type: String, default: 'Active' },
    createdAt: { type: Date, default: Date.now }
});

const Store = mongoose.model('Store', StoreSchema);

// وظيفة الربط التلقائي للدومينات عبر Cloudflare API
async function createCloudflareDNS(subdomain) {
    try {
        await axios.post(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
            type: "A",
            name: subdomain,
            content: SERVER_IP,
            ttl: 1,
            proxied: true // تفعيل حماية Cloudflare و SSL تلقائياً
        }, {
            headers: { 
                'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`, 
                'Content-Type': 'application/json' 
            }
        });
        return true;
    } catch (error) {
        console.error("DNS Error:", error.response ? error.response.data : error.message);
        return false;
    }
}

// رابط إنشاء متجر جديد
app.post('/api/stores/create', async (req, res) => {
    try {
        const dnsSuccess = await createCloudflareDNS(req.body.subdomain);
        if (dnsSuccess) {
            const store = new Store(req.body);
            await store.save();
            res.json({ success: true, url: `${req.body.subdomain}.talla.com` });
        } else {
            res.status(500).json({ success: false, message: "فشل ربط الدومين تلقائياً" });
        }
    } catch (err) {
        res.status(400).json({ success: false, message: "هذا الرابط محجوز مسبقاً" });
    }
});

// لوحة تحكم المالك (تحتاج كود الدخول السري 22422)
app.get('/api/admin/all-stores', async (req, res) => {
    if (req.headers.authorization === '22422') { //
        const stores = await Store.find();
        res.json(stores);
    } else {
        res.status(403).send("غير مسموح لك بالدخول");
    }
});

app.listen(3000, () => console.log("المنصة تعمل على المنفذ 3000"));
