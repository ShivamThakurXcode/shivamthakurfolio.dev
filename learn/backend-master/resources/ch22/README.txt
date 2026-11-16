Chapter 22 labs. npm i express jose pg   Needs bmh-pg-test (Chapter 12).
  node 01-authz-attacks-and-fixes.mjs   creates schema ch22 + users/orders; runs IDOR, function-level, mass-assignment, policy tests
  node 02-row-level-security.mjs        needs 01 to have run first (uses ch22.orders); creates and drops a role app_user
WARNING: 01 deliberately contains vulnerable routes (including SQL built from request keys). Never deploy them.
