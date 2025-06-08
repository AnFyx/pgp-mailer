async function getPrivateKeyFromStoreOrPrompt() {
  let stored;
  try {
    stored = await chrome.runtime.sendMessage({
      type: "KEY_STORE_ACTION",
      action: "listKeys"
    });
  } catch (e) {
    console.error("Extension context lost or invalid:", e);
    alert("The extension context was lost. Try reloading the Gmail tab.");
    return null;
  }

  const privKeys = stored?.privateKeys || {};

  const activeKeyData = await chrome.runtime.sendMessage({
    type: "KEY_STORE_ACTION",
    action: "getActivePrivateKey"
  });
  const activeEmail = activeKeyData?.email || null;

  if (activeEmail && privKeys[activeEmail]) {
    return privKeys[activeEmail];
  }

  const input = prompt("Paste your PRIVATE key:");
  if (!input) return null;

  const shouldStore = confirm("Do you want to store this private key for future use?");
  if (shouldStore) {
    const email = prompt("Enter your email to associate with this private key:");
    if (!email) return null;
    
    await chrome.runtime.sendMessage({
      type: "KEY_STORE_ACTION",
      action: "savePrivateKey",
      email,
      armoredKey: input
    });

    const shouldBeActive = confirm("Set this private key as your active key?");
    if (shouldBeActive) {
      await chrome.runtime.sendMessage({
        type: "KEY_STORE_ACTION",
        action: "setActivePrivateKey",
        email
      });
    }
  }

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
  let key;
  try {
    key = await chrome.runtime.sendMessage({
      type: "KEY_STORE_ACTION",
      action: "getPublicKey",
      email
    });
  } catch (err) {
    console.error("Failed to get public key from background:", err);
  }

  if (key && key.armoredKey) return key.armoredKey;

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

  const privateKey = await openpgp.readPrivateKey({ armoredKey: String(privKeyArmored) });
  const decryptedKey = passphrase
    ? await openpgp.decryptKey({ privateKey, passphrase })
    : privateKey;

  const message = await openpgp.createMessage({ text: originalText });
  let output;

  if (action === "Encrypt") {
    output = await openpgp.encrypt({ message, encryptionKeys: publicKey });
  } else if (action === "Sign") {
    const message = await openpgp.createCleartextMessage({ text: originalText });
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
    } else if (content.includes("-----BEGIN PGP SIGNED MESSAGE-----")) {
      const senderElement = document.querySelector('[class="go"]');
      if (!senderElement) continue;

      const senderText = senderElement.textContent.trim();
      const senderEmail = senderText.match(/<([^>]+)>/)?.[1] || 
                         senderText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i)?.[0] || 
                         senderText;

      const pubKeyArmored = await getPublicKeyFromStoreOrPrompt(senderEmail);
      if (!pubKeyArmored) continue;

      try {
        const publicKey = await openpgp.readKey({ armoredKey: pubKeyArmored });
        const cleartextMessage = await openpgp.readCleartextMessage({ cleartextMessage: content });
        const verificationResult = await openpgp.verify({
          message: cleartextMessage,
          verificationKeys: publicKey
        });

        const { verified, keyID } = verificationResult.signatures[0];
        await verified; // throws if signature is invalid

        const verifiedDiv = document.createElement("div");
        verifiedDiv.style.border = "1px solid #bbdefb";
        verifiedDiv.style.background = "#e3f2fd";
        verifiedDiv.style.padding = "10px";
        verifiedDiv.style.marginTop = "10px";
        verifiedDiv.style.whiteSpace = "pre-wrap";
        verifiedDiv.innerHTML = `<strong>PGP Signature Verified</strong><br>From: ${senderEmail}<br>Key ID: ${keyID.toHex()}<br><br><strong>Message:</strong><br>${cleartextMessage.getText()}`;

        block.dataset.decrypted = "true";
        block.textContent = "PGP signed message detected. Verified version below ↓";
        block.parentElement.appendChild(verifiedDiv);
      } catch (err) {
        console.error("PGP signature verification failed:", err);
        const errorDiv = document.createElement("div");
        errorDiv.style.border = "1px solid #ffcdd2";
        errorDiv.style.background = "#ffebee";
        errorDiv.style.padding = "10px";
        errorDiv.style.marginTop = "10px";
        errorDiv.style.whiteSpace = "pre-wrap";
        errorDiv.innerHTML = `<strong>PGP Signature Verification Failed</strong><br>Error: ${err.message}`;

        block.parentElement.appendChild(errorDiv);
      }
    }
  }
}

const observer = new MutationObserver(() => {
  insertButtons();
  tryAutoDecryptPGPMessages();
});
observer.observe(document.body, { childList: true, subtree: true });
