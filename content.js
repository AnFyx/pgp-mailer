chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type !== "KEY_STORE_ACTION") return;

      const { action, fingerprint, email, armoredKey, type, id } = message;

      const get = async (key) => (await chrome.storage.local.get(key))[key] || {};
      const set = async (key, value) => chrome.storage.local.set({ [key]: value });

      switch (action) {
        case "savePrivateKey": {
          const keys = await get("privateKeys");
          keys[fingerprint] = armoredKey;
          await set("privateKeys", keys);
          sendResponse({ success: true });
          break;
        }

        case "getPrivateKey": {
          const keys = await get("privateKeys");
          sendResponse(keys[fingerprint] || null);
          break;
        }

        case "savePublicKey": {
          const keys = await get("publicKeys");
          keys[email] = armoredKey;
          await set("publicKeys", keys);
          sendResponse({ success: true });
          break;
        }

        case "getPublicKey": {
          const keys = await get("publicKeys");
          sendResponse(keys[email] || null);
          break;
        }

        case "deleteKey": {
          const keyGroup = type === "private" ? "privateKeys" : "publicKeys";
          const keys = await get(keyGroup);
          delete keys[id];
          await set(keyGroup, keys);
          sendResponse({ success: true });
          break;
        }

        case "listKeys": {
          const privateKeys = await get("privateKeys");
          const publicKeys = await get("publicKeys");
          sendResponse({ privateKeys, publicKeys });
          break;
        }

        default:
          sendResponse({ error: "Unknown action" });
      }
    } catch (err) {
      console.error("Error handling message:", err);
      sendResponse({ error: "Internal error", details: err.message });
    }
  })();

  return true;
});

async function getPrivateKeyFromStoreOrPrompt() {
  const stored = await chrome.runtime.sendMessage({
    type: "KEY_STORE_ACTION",
    action: "listKeys"
  });

  const privKeys = stored?.privateKeys || {};
  const fingerprints = Object.keys(privKeys);
  if (fingerprints.length > 0) {
    return privKeys[fingerprints[0]];
  }

  const input = prompt("Paste your PRIVATE key:");
  if (!input) return null;

  const privKey = await openpgp.readPrivateKey({ armoredKey: input });
  const fp = privKey.getFingerprint();

  await chrome.runtime.sendMessage({
    type: "KEY_STORE_ACTION",
    action: "savePrivateKey",
    fingerprint: fp,
    armoredKey: input
  });

  return input;
}

async function getRecipientEmailFromDOM() {
  const container = document.querySelector('div[class="aoD hl"]');
  if (container) {
    const span = container.querySelector('span[email]');
    const email = span ? span.getAttribute('email') : null;
    if (email && email.trim()) return email.trim();
  }

  alert("Recipient email not found. Please enter a recipient in the 'To' field.");
  return null;
}

async function getPublicKeyFromStoreOrPrompt(email) {
  const key = await chrome.runtime.sendMessage({
    type: "KEY_STORE_ACTION",
    action: "getPublicKey",
    email
  });

  if (key) return key;

  const input = prompt(`Paste PUBLIC key for ${email}:`);
  if (!input) return null;

  const shouldStore = confirm("Do you want to store this public key for future use?");
  if (shouldStore) {
    await chrome.runtime.sendMessage({
      type: "KEY_STORE_ACTION",
      action: "savePublicKey",
      email,
      armoredKey: input
    });
  }

  return input;
}

// MutationObserver to inject PGP buttons in compose window
function insertButtons() {
  const existing = document.getElementById("pgp-btn-container");
  if (existing) return;

  const actionRow = document.querySelector("tr.btC");
  if (!actionRow) return;

  const sendCell = actionRow.querySelector("td.gU.Up");
  const discardCell = actionRow.querySelector("td.oc.gU");

  if (!sendCell || !discardCell) return;

  const td = document.createElement("td");
  td.style.padding = "0 4px";
  td.style.verticalAlign = "middle";

  const container = document.createElement("div");
  container.id = "pgp-btn-container";
  container.style.display = "flex";
  container.style.gap = "6px";
  container.style.alignItems = "center";

  ["Encrypt", "Sign", "Sign & Encrypt"].forEach((action) => {
    const btn = document.createElement("button");
    btn.textContent = action;
    btn.style.padding = "6px 12px";
    btn.style.border = "1px solid #dadce0";
    btn.style.borderRadius = "4px";
    btn.style.background = "#f1f3f4";
    btn.style.color = "#202124";
    btn.style.fontSize = "12px";
    btn.style.fontWeight = "500";
    btn.style.cursor = "pointer";
    btn.style.fontFamily = "Google Sans, Roboto, Arial, sans-serif";
    btn.style.pointerEvents = "auto";
    btn.onmouseenter = () => {
      btn.style.background = "#e8eaed";
    };
    btn.onmouseleave = () => {
      btn.style.background = "#f1f3f4";
    };
    btn.onclick = (e) => {
      e.stopPropagation();
      handlePGPAction(action);
    };
    container.appendChild(btn);
  });

  td.appendChild(container);
  actionRow.insertBefore(td, discardCell);
}

// Function to encrypt or sign messages
async function handlePGPAction(action) {
  const bodyElem = document.querySelector('[class="Am aiL Al editable LW-avf tS-tW"][contenteditable="true"]');
  if (!bodyElem) return;
  const originalText = bodyElem.innerText;

  const privKeyArmored = await getPrivateKeyFromStoreOrPrompt();
  if (!privKeyArmored) return;

  const passphrase = prompt("Enter passphrase (leave blank if none):") || "";

  let publicKey;
  if (action.includes("Encrypt")) {
    const email = await getRecipientEmailFromDOM();
    if (!email) return;

    const pubKeyArmored = await getPublicKeyFromStoreOrPrompt(email);
    if (!pubKeyArmored) return;

    publicKey = await openpgp.readKey({ armoredKey: pubKeyArmored });
  }

  const privateKey = await openpgp.readPrivateKey({ armoredKey: privKeyArmored });
  const decryptedKey = passphrase
    ? await openpgp.decryptKey({ privateKey, passphrase })
    : privateKey;

  const message = await openpgp.createMessage({ text: originalText });
  let output;

  if (action === "Encrypt") {
    output = await openpgp.encrypt({ message, encryptionKeys: publicKey });
  } else if (action === "Sign") {
    output = await openpgp.sign({ message, signingKeys: decryptedKey, format: "armored" });
  } else if (action === "Sign & Encrypt") {
    output = await openpgp.encrypt({ message, encryptionKeys: publicKey, signingKeys: decryptedKey });
  }

  const editable = document.querySelector('[class="Am aiL Al editable LW-avf tS-tW"][contenteditable="true"]');
  if (!editable) {
    alert("Unable to find message body.");
    return;
  }
  editable.focus();
  editable.innerHTML = "";
  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = output;
  editable.appendChild(pre);
  editable.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

// NEW: Detect and decrypt PGP messages in opened emails
async function tryAutoDecryptPGPMessages() {
  const pgpBlocks = document.querySelectorAll(".a3s pre:not([data-decrypted])");
  for (const block of pgpBlocks) {
    const content = block.textContent;
    if (content.includes("-----BEGIN PGP MESSAGE-----")) {
      block.dataset.decrypted = "true";
      let privKeyArmored = await getPrivateKeyFromStoreOrPrompt();
      if (!privKeyArmored) {
        privKeyArmored = prompt("PGP message detected. Paste your PRIVATE key to decrypt:");
        if (!privKeyArmored) continue;
        await setStorageKey("privateKey", privKeyArmored);
      }
      const passphrase = prompt("Enter passphrase (leave blank if none):") || "";

      try {
        const privateKey = await openpgp.readPrivateKey({ armoredKey: privKeyArmored });
        const decryptedKey = passphrase ? await openpgp.decryptKey({ privateKey, passphrase }) : privateKey;
        const message = await openpgp.readMessage({ armoredMessage: content });
        const { data: decrypted } = await openpgp.decrypt({ message, decryptionKeys: decryptedKey });

        block.dataset.decrypted = "true";
        block.textContent = "Encrypted PGP message detected. Decrypted version below ↓";

        const decryptedDiv = document.createElement("div");
        decryptedDiv.style.border = "1px solid #c8e6c9";
        decryptedDiv.style.background = "#f1f8e9";
        decryptedDiv.style.padding = "10px";
        decryptedDiv.style.marginTop = "10px";
        decryptedDiv.style.whiteSpace = "pre-wrap";
        decryptedDiv.innerHTML = "<strong>Decrypted Message:</strong><br>" + decrypted;

        block.parentElement.appendChild(decryptedDiv);
      } catch (err) {
        console.error("PGP decryption failed:", err);
      }
    }
  }
}

// Start observing DOM
const observer = new MutationObserver(() => {
  insertButtons();
  tryAutoDecryptPGPMessages();
});
observer.observe(document.body, { childList: true, subtree: true });
