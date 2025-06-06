# PGP Mailer – Gmail Signing and Encryption Extension

## 📌 Description  
**PGP Mailer** is a Chrome browser extension that allows users to digitally sign and encrypt Gmail messages using **inline PGP**. It enhances email security directly within Gmail, allowing easy key management and secure communication without leaving the Gmail interface.

## ✅ Features  
- 🔐 Encrypt email messages using PGP  
- ✍️ Digitally sign outgoing messages  
- 📥 Decrypt PGP-encrypted messages  
- 🔑 Manage public and private keys via popup  
- 📧 Seamless integration into Gmail interface  
- 💬 Inline PGP support for compatibility with most email clients  

## 🛠 Installation Instructions  
1. Download and unzip the project folder.  
2. Open **Google Chrome** and go to: `chrome://extensions/`  
3. Enable **Developer mode** (toggle in the top-right corner).  
4. Click **"Load unpacked"** and select the unzipped project folder.  
5. Open Gmail in a new tab. You should see new buttons for encryption and signing.  

## 📂 File Structure  
```
/
  ├─ manifest.json
  ├─ background.js
  ├─ content.js
  ├─ popup.html
  ├─ popup.js
  ├─ openpgp.min.js
  └─ README.md

/icons/
  ├─ icon.png
  ├─ icon32.png
  ├─ icon48.png
  └─ icon128.png
```

## 🚫 Limitations  
- Only supports **inline PGP**, not PGP/MIME  
- Does not sync keys across devices  

## 👨‍💻 Authors  
- Bruno Silva Sá
- Thomas Iliot

## 📝 License  
This project was created for educational purposes as part of the 2025 Information Security Fundamentals course at the University of Maribor.  