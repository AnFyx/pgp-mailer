function sendKeyStoreAction(action, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "KEY_STORE_ACTION", action, ...payload }, resolve);
  });
}

export async function savePrivateKey(fingerprint, armoredKey) {
  return sendKeyStoreAction("savePrivateKey", { fingerprint, armoredKey });
}

export async function getPrivateKey(fingerprint) {
  return sendKeyStoreAction("getPrivateKey", { fingerprint });
}

export async function savePublicKey(email, armoredKey) {
  return sendKeyStoreAction("savePublicKey", { email, armoredKey });
}

export async function getPublicKey(email) {
  return sendKeyStoreAction("getPublicKey", { email });
}

export async function deleteKey(type, id) {
  return sendKeyStoreAction("deleteKey", { type, id });
}

export async function listKeys() {
  return sendKeyStoreAction("listKeys");
}
