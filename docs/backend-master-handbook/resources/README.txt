Backend Master Handbook - lab files
===================================
Each chapter that ran real code keeps its scripts here, so you can repeat the experiments.

Top level (Chapters 13-16, ShopLine + PostgreSQL)
  shopline-schema.sql         the ShopLine schema used from Chapter 14 on
  shopline-v2-migration.sql   the tested migration from Chapter 14
  ch13-queries.sql            SQL practice queries (Chapter 13)
  ch14-migrate.mjs            a small migration runner (Chapter 14)
  ch15-setup.sql              the one-million-row setup for index experiments (Chapter 15)
  ch16-*.mjs                  concurrency, locks and isolation labs (Chapter 16)

Folders ch17 ... ch29 hold one chapter each; every folder has its own README.txt
with the exact commands and what was and was not run.

Chapters 30-36 were written without running their examples, so they ship no lab files.
Run everything yourself before relying on it in production.
