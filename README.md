# PGP Mailer: inline PGP signing and encryption for Gmail

Chrome extension (Manifest V3) that signs, encrypts, decrypts and verifies inline PGP messages directly in the Gmail interface, using [OpenPGP.js](https://openpgpjs.org/).

Built in June 2025 as the project for the Information Security Fundamentals course at the University of Maribor (Erasmus+ exchange), then reviewed and hardened in September 2025 before publication.

## Features

- Sign, encrypt, or sign and encrypt a message being composed, from buttons added to the Gmail toolbar.
- Automatically detect, decrypt and verify inline PGP messages when reading mail.
- Import and manage public and private keys from the extension popup.
- Inline PGP only (not PGP/MIME), for compatibility with most mail clients.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open the extension popup and import a key pair. Keys are generated outside the extension, for example with GnuPG:
   ```bash
   gpg --full-generate-key
   gpg --armor --export-secret-keys you@example.org   # private key, passphrase-protected
   gpg --armor --export you@example.org               # public key, to share
   ```
5. Open Gmail. The Encrypt, Sign and Sign & Encrypt buttons appear in the compose toolbar.

Private keys must be passphrase-protected: an unprotected key is refused at import (see Security).

## How it works

| File | Role |
|---|---|
| `manifest.json` | Manifest V3 declaration; the only permission requested is `storage`, scoped to `https://mail.google.com/*` |
| `content.js` | Injected into Gmail: adds the toolbar buttons, watches for incoming PGP blocks, decrypts and verifies them |
| `background.js` | Service worker; the only component that reads and writes the key store |
| `keyStore.js` | Promise-based wrapper around the messages sent to the service worker |
| `popup.html`, `popup.js` | Key management interface: import, list, select the active private key, delete |
| `openpgp.min.js` | OpenPGP.js 5.11.3, bundled (LGPL, see `LICENSE-openpgp.txt`) |

Composing goes through `openpgp.sign` or `openpgp.encrypt` and replaces the message body with the armoured block. Reading walks the message DOM, decrypts with the active private key, and verifies the signature against the sender's stored public key.

## Security

Threat model: the extension protects message contents in transit and at rest on the mail provider's servers. It assumes the user's own machine and browser profile are trusted.

What is in place:
- **Sender-controlled content is never treated as HTML.** Decrypted text, signed text, sender addresses and error messages are inserted with `textContent`, so a malicious sender cannot inject markup into the recipient's Gmail page.
- **Private keys never leave the extension popup.** The content script never asks for a private key inside the Gmail page, since a prompt for a private key on a web page is indistinguishable from phishing.
- **Passphrase-less private keys are refused at import**, because the browser key store is not encrypted (see below).
- **Passphrases are never stored.** They are asked per operation and only held for the duration of the call.
- **Least privilege.** The only permission is `storage`; the extension runs on `mail.google.com` only, makes no network request of its own, and contains no `eval`, no dynamic script injection and no remote code.
- **OpenPGP.js 5.11.3**, which fixes CVE-2025-47934: in 5.0.1 to 5.11.2, a modified message could be reported as validly signed by both `openpgp.verify` and `openpgp.decrypt`, the two calls this extension relies on.

Known limitations:
- **Private keys are stored unencrypted by the browser.** `chrome.storage.local` is plain on disk, so the armoured private key is readable by anything with access to the Chrome profile. The passphrase on the key is what actually protects it; the extension does not add a layer of its own.
- **The sender address shown next to a verified signature comes from the Gmail DOM**, and the public key is looked up by that address. The key ID is displayed so it can be checked against the expected fingerprint.
- **No key server, no web of trust, no key expiry or revocation checks.** Public keys are trusted because the user imported them.
- **Gmail DOM selectors are brittle**: a Gmail interface change can stop the buttons or the automatic decryption from appearing.
- **Not audited, and not intended for use where a message being read would put someone at risk.** For that, use a maintained client such as Thunderbird with OpenPGP, or Mailvelope.

## Tests

```bash
npm install
npm test
```

The tests run in a simulated DOM (jsdom) and need no keys and no network. They cover the rendering of sender-controlled content, the popup key rows, the refusal of passphrase-less private keys, the manifest permissions, and the bundled OpenPGP.js version. Fourteen of the sixteen fail against the pre-publication code.

## History and credits

- Written by **Bruno Silva Sá** and **Thomas Iliot** ([@AnFyx](https://github.com/AnFyx)), working together on a single machine. The original commits were made from Bruno's git identity (`TealOrchid`) and carry both of us as authors.
- The commits from September 2025 onwards are the review and hardening done for publication: HTML injection fix, OpenPGP.js update, key handling changes, tests and this README.
- Published with Bruno's agreement.

No license: all rights reserved by the authors. OpenPGP.js is bundled under the LGPL, see `LICENSE-openpgp.txt`.
