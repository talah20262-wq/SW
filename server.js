const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('public')); // لتقديم ملفات الواجهة

// التأكد من وجود مجلدات التخزين
const DIRS = ['builds', 'outputs', 'public'];
DIRS.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); });

// نقطة النهاية لبناء التطبيق
app.post('/generate-apk', (req, res) => {
    const { url, name } = req.body;
    if (!url || !name) return res.status(400).json({ error: "بيانات ناقصة" });

    const appId = `app_${Date.now()}`;
    const projectPath = path.join(__dirname, 'builds', appId);

    console.log(`[NEGM Engine] جاري بناء تطبيق: ${name} للرابط: ${url}`);

    // تسلسل أوامر بناء التطبيق (محاكاة البيئة البرمجية)
    const buildCmd = `
        mkdir -p ${projectPath} && cd ${projectPath} &&
        npm init -y &&
        npm i @capacitor/core @capacitor/cli @capacitor/android &&
        npx cap init "${name}" "com.negm.${appId}" --web-dir www &&
        mkdir www && echo '<script>window.location.href="${url}";</script>' > www/index.html &&
        npx cap add android &&
        npx cap copy android &&
        cd android && ./gradlew assembleDebug
    `;

    exec(buildCmd, (err, stdout, stderr) => {
        if (err) {
            console.error("خطأ في البناء:", stderr);
            return res.status(500).json({ error: "فشل بناء التطبيق، تأكد من إعدادات Android SDK على السيرفر" });
        }

        const apkSource = path.join(projectPath, 'android/app/build/outputs/apk/debug/app-debug.apk');
        const apkFinal = path.join(__dirname, 'outputs', `${name}.apk`);

        if (fs.existsSync(apkSource)) {
            fs.renameSync(apkSource, apkFinal);
            res.json({ success: true, downloadUrl: `/download/${encodeURIComponent(name)}.apk` });
        } else {
            res.status(500).json({ error: "ملف APK لم يتولد" });
        }
    });
});

// رابط التحميل
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'outputs', req.params.filename);
    res.download(filePath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 NEGM Engine Active on Port ${PORT}`));
