SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE products;

INSERT INTO products (product_id, name, price) VALUES (1, 'Cucumber', 1.0), (2, 'Tomato', 2.0);

SET FOREIGN_KEY_CHECKS = 1;
