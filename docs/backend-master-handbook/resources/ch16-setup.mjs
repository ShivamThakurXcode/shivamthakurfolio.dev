import { pool } from './ch16-lib.mjs';
await pool.query('DROP SCHEMA IF EXISTS ch16 CASCADE');
await pool.query('CREATE SCHEMA ch16');
await pool.query(`CREATE TABLE ch16.products (id int PRIMARY KEY, name text, stock int NOT NULL CHECK (stock >= 0), version int NOT NULL DEFAULT 1)`);
await pool.query(`INSERT INTO ch16.products VALUES (1,'Last Sneakers',10,1)`);
await pool.end(); console.log('ok');
