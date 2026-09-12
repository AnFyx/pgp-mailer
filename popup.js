import {
  savePrivateKey,
  savePublicKey,
  deleteKey,
  listKeys,
  setActivePrivateKey,
  getActivePrivateKey
} from './keyStore.js';

const keyInput = document.getElementById("keyInput");
const emailInput = document.getElementById("emailInput");
const privateKeySelector = document.getElementById("privateKeySelector");
const privateKeyList = document.getElementById("privateKeyList");
const publicKeyList = document.getElementById("publicKeyList");

document.getElementById("importKey").addEventListener("click", async () => {
  const keyText = keyInput.value.trim();
  const email = emailInput.value.trim();

  if (!keyText) return alert("Please enter a key.");
  if (!email) return alert("Please enter an email address.");

  try {
    if (keyText.includes("PRIVATE")) {
      const privKey = await openpgp.readPrivateKey({ armoredKey: keyText });
      await savePrivateKey(email, keyText);
      await setActivePrivateKey(email);
      alert("Private key saved.");
    } else if (keyText.includes("PUBLIC")) {
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

privateKeySelector.addEventListener("change", async () => {
  const selectedEmail = privateKeySelector.value;
  if (selectedEmail) {
    await setActivePrivateKey(selectedEmail);
    await listAndRenderKeys();
  }
});

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

// Construit une ligne « clé + bouton de suppression » sans jamais interpréter
// l'adresse comme du HTML (elle est saisie par l'utilisateur).
function createKeyRow(email, keyType) {
  const row = document.createElement("div");
  row.className = "key-item";
  row.appendChild(document.createTextNode("\u{1F511} " + email + " "));
  const remove = document.createElement("button");
  remove.dataset.id = email;
  remove.dataset.type = keyType;
  remove.textContent = "\u274C";
  row.appendChild(remove);
  return row;
}

async function listAndRenderKeys() {
  privateKeySelector.textContent = "";
  privateKeyList.textContent = "Loading...";
  publicKeyList.textContent = "Loading...";

  try {
    const { privateKeys, publicKeys } = await listKeys();
    const activeEmail = await getActivePrivateKey();
    const privateEmails = Object.keys(privateKeys);

    if (privateEmails.length > 0) {
      privateEmails.forEach(email => {
        const option = document.createElement("option");
        option.value = email;
        option.textContent = email;
        if (activeEmail.email === email) option.selected = true;
        privateKeySelector.appendChild(option);
      });

      privateKeyList.textContent = "";
      privateEmails.forEach(email => {
        privateKeyList.appendChild(createKeyRow(email, "private"));
      });
    } else {
      privateKeyList.textContent = "No private keys stored";
    }

    publicKeyList.textContent = "";
    const publicEmails = Object.keys(publicKeys);
    if (publicEmails.length === 0) {
      publicKeyList.textContent = "No public keys stored";
    } else {
      publicEmails.forEach((email) => {
        publicKeyList.appendChild(createKeyRow(email, "public"));
      });
    }
  } catch (err) {
    console.error("Error listing keys:", err);
    privateKeyList.textContent = "Error";
    publicKeyList.textContent = "Error";
  }
}

listAndRenderKeys();
