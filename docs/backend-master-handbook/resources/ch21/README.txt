Chapter 21 labs. npm i express jose argon2 bcryptjs pg redis   (Express 5)
Needs bmh-pg-test (54329) and bmh-redis-test (54331) from Chapters 12 and 19.
  node hash.mjs         password-hash speed, salting, bcrypt 72-byte limit
  node auth-test.mjs    creates schema ch21, starts auth-app.mjs, runs the whole attack/defence tour (~20 s)
  node timing.mjs       user-enumeration timing (run after auth-test.mjs)
  node totp-pkce.mjs    RFC 6238 / 4226 / 7636 test vectors, TOTP verifier, reset tokens
auth-app.mjs is the tested ShopLine auth module (cookie sessions + JWT + rotating refresh tokens).
NOTE: it sets the cookie "Secure"; over plain http a browser would not send it back. Use https or a localhost exception when trying it with a browser.
