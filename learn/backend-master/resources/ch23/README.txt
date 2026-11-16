Chapter 23 lab: npm i express helmet cors ; node security-lab.mjs   (~15 s; the ReDoS section deliberately burns CPU for a few seconds)
It starts a vulnerable+fixed Express app and a private "internal" server on random localhost ports, attacks it, and prints results.
Only run on your own machine. The vulnerable routes (v1) are intentionally insecure: never deploy them.
security-lab.expected-output.txt is the output captured while writing the chapter (ports differ per run).
