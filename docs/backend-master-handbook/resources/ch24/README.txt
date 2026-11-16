Chapter 24: the ShopLine testing project (Node 22, built-in node:test runner).
  npm install            (pg express fast-check autocannon)
  needs the bmh-pg-test container from Chapter 12 (each test file creates and drops its own schema t24_<name>)
  npm test                                  all 25 tests (~1.4 s)
  node --test --experimental-test-coverage  coverage report
  node mutate.mjs                           hand-rolled mutation testing (restores the source files afterwards)
  node flaky.mjs                            demonstrates a wall-clock-dependent flaky test
  node load.mjs                             autocannon load test: 50 clients, pool size 2 vs 20
IMPORTANT: put helpers in support/, not test/: `node --test` runs EVERY .js file inside a directory named test.
