chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "KEY_STORE_ACTION") return false;

  const storage = chrome.storage.local;

  function getStorage(keys) {
    return new Promise(resolve => storage.get(keys, resolve));
  }
  function setStorage(items) {
    return new Promise(resolve => storage.set(items, resolve));
  }

  async function handleAction() {
    switch (message.action) {
      case "savePrivateKey": {
        const { email, armoredKey } = message;
        if (!email || !armoredKey) return { error: "Missing parameters" };
        const data = await getStorage(["privateKeys"]);
        const privateKeys = data.privateKeys || {};
        privateKeys[email] = armoredKey;
        await setStorage({ privateKeys });
        return { success: true };
      }

      case "getPrivateKey": {
        const { email } = message;
        if (!email) return { error: "Missing email" };
        const data = await getStorage(["privateKeys"]);
        const privateKeys = data.privateKeys || {};
        return { armoredKey: privateKeys[email] || null };
      }

      case "savePublicKey": {
        const { email, armoredKey } = message;
        if (!email || !armoredKey) return { error: "Missing parameters" };
        const data = await getStorage(["publicKeys"]);
        const publicKeys = data.publicKeys || {};
        publicKeys[email] = armoredKey;
        await setStorage({ publicKeys });
        return { success: true };
      }

      case "getPublicKey": {
        const { email } = message;
        if (!email) return { error: "Missing email" };
        const data = await getStorage(["publicKeys"]);
        const publicKeys = data.publicKeys || {};
        return { armoredKey: publicKeys[email] || null };
      }

      case "deleteKey": {
        const { keyType, id } = message;
        if (keyType === "private") {
          const data = await getStorage(["privateKeys"]);
          const privateKeys = data.privateKeys || {};
          const active = await getStorage(["activePrivateKey"]);
          if (privateKeys[id]) {
            delete privateKeys[id];
            await setStorage({ privateKeys });
            if (active.activePrivateKey === id) {
              const remaining = Object.keys(privateKeys);
              const newActive = remaining.length > 0 ? remaining[0] : null;
              await setStorage({ activePrivateKey: newActive });
            }
            return { success: true };
          } else {
            return { error: "Private key not found" };
          }
        } else if (keyType === "public") {
          const data = await getStorage(["publicKeys"]);
          const publicKeys = data.publicKeys || {};
          if (publicKeys[id]) {
            delete publicKeys[id];
            await setStorage({ publicKeys });
            return { success: true };
          } else {
            return { error: "Public key not found" };
          }
        } else {
          return { error: "Unknown key type" };
        }
      }

      case "listKeys": {
        const data = await getStorage(["privateKeys", "publicKeys"]);
        return {
          privateKeys: data.privateKeys || {},
          publicKeys: data.publicKeys || {},
        };
      }

      case "setActivePrivateKey": {
        const { email } = message;
        if (!email) return { error: "Missing email" };
        await setStorage({ activePrivateKey: email });
        return { success: true };
      }

      case "getActivePrivateKey": {
        const data = await getStorage(["activePrivateKey"]);
        return { email: data.activePrivateKey || null };
      }

      default:
        return { error: "Unknown action" };
    }
  }

  handleAction()
    .then(result => sendResponse(result))
    .catch(err => {
      console.error("Background error:", err);
      sendResponse({ error: err.message || String(err) });
    });

  return true;
});
