import {
  savePrivateKey,
  getPrivateKey,
  savePublicKey,
  getPublicKey,
  deleteKey,
  listKeys
} from './keyStore.js';

const keyInput = document.getElementById("keyInput");
const emailInput = document.getElementById("emailInput");

keyInput.addEventListener("input", () => {
  const keyText = keyInput.value.trim();
  if (keyText.includes("PUBLIC")) {
    emailInput.style.display = "block";
  } else {
    emailInput.style.display = "none";
    emailInput.value = "";
  }
});

document.getElementById("importKey").addEventListener("click", async () => {
  const keyText = document.getElementById("keyInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  if (!keyText) return alert("Please paste a key.");

  try {
    if (keyText.includes("PRIVATE")) {
      const privKey = await openpgp.readPrivateKey({ armoredKey: keyText });
      await savePrivateKey(privKey.getFingerprint(), keyText);
      alert("Private key saved.");
    } else if (keyText.includes("PUBLIC")) {
      if (!email) return alert("Email required for public key.");
      await savePublicKey(email, keyText);
      alert("Public key saved.");
    } else {
      alert("Not a valid PGP key.");
    }
    location.reload();
  } catch (e) {
    console.error(e);
    alert("Error importing key.");
  }
});

async function listAndRenderKeys() {
  const privateKeyStatus = document.getElementById("privateKeyStatus");
  const publicKeyList = document.getElementById("publicKeyList");

  privateKeyStatus.textContent = "Loading...";
  publicKeyList.textContent = "Loading...";

  try {
    const { privateKeys, publicKeys } = await listKeys();

    // Private key status
    const privateFingerprints = Object.keys(privateKeys);
    if (privateFingerprints.length > 0) {
      const fp = privateFingerprints[0];
      privateKeyStatus.innerHTML = `✅ Stored (Fingerprint: ${fp}) <button data-id="${fp}" data-type="private">❌</button>`;
    } else {
      privateKeyStatus.textContent = "❌ Not stored";
    }

    // Public keys list
    publicKeyList.innerHTML = "";
    const publicEmails = Object.keys(publicKeys);
    if (publicEmails.length === 0) {
      publicKeyList.textContent = "❌ No public keys stored";
    } else {
      publicEmails.forEach((email) => {
        const div = document.createElement("div");
        div.className = "key-item";
        div.innerHTML = `📧 ${email} <button data-id="${email}" data-type="public">❌</button>`;
        publicKeyList.appendChild(div);
      });
    }
  } catch (err) {
    console.error("Error listing keys:", err);
    privateKeyStatus.textContent = "❌ Error";
    publicKeyList.textContent = "❌ Error";
  }
}

// Handle delete button clicks
document.body.addEventListener("click", async (e) => {
  if (e.target.tagName === "BUTTON" && e.target.dataset.type) {
    const { type, id } = e.target.dataset;
    try {
      await deleteKey(type, id);
      location.reload();
    } catch (err) {
      alert("Failed to delete key.");
      console.error(err);
    }
  }
});

listAndRenderKeys();
