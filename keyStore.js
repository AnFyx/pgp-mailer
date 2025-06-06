function sendKeyStoreAction(action, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "KEY_STORE_ACTION", action, ...payload },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Message failed:", chrome.runtime.lastError);
          return reject(chrome.runtime.lastError);
        }
        if (response?.error) return reject(new Error(response.error));
        resolve(response);
      }
    );
  });
}

export async function savePrivateKey(email, armoredKey) {
  return sendKeyStoreAction("savePrivateKey", { email, armoredKey });
}

export async function getPrivateKey(email) {
  return sendKeyStoreAction("getPrivateKey", { email });
}

export async function savePublicKey(email, armoredKey) {
  return sendKeyStoreAction("savePublicKey", { email, armoredKey });
}

export async function getPublicKey(email) {
  return sendKeyStoreAction("getPublicKey", { email });
}

export async function deleteKey(keyType, id) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "KEY_STORE_ACTION", action: "deleteKey", keyType, id },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Message failed:", chrome.runtime.lastError);
          return reject(chrome.runtime.lastError);
        }
        if (response?.error) return reject(new Error(response.error));
        resolve(response);
      }
    );
  });
}

export async function listKeys() {
  return sendKeyStoreAction("listKeys");
}

export async function setActivePrivateKey(email) {
  return sendKeyStoreAction("setActivePrivateKey", { email });
}

export async function getActivePrivateKey() {
  return sendKeyStoreAction("getActivePrivateKey");
}
