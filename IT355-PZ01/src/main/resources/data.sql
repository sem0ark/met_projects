SET FOREIGN_KEY_CHECKS = 0;

-- supposed to be a bit more efficient
TRUNCATE TABLE comments;
TRUNCATE TABLE reviews;
TRUNCATE TABLE product_images;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;

INSERT INTO categories (id, name, description) VALUES (1, 'Electronics', 'Devices that use electricity.'), (2, 'Books', 'Printed or digital publications.'), (3, 'Smartphones', 'Mobile phones with advanced computing capabilities.'), (4, 'Laptops', 'Portable personal computers.'), (5, 'Fiction', 'Imaginative literary works.'), (6, 'Non-Fiction', 'Fact-based literary works.');

INSERT INTO products (product_id, name, description, price, stock_quantity, category_id) VALUES (101, 'Smartphone X', 'Latest model with advanced camera and processor.', 999.99, 50, 3), (102, 'Laptop Pro 15', 'High-performance laptop for professionals.', 1499.00, 30, 4), (103, 'The Great Adventure', 'A thrilling fantasy novel.', 19.95, 200, 5), (104, 'History of the World', 'Comprehensive guide to world history.', 35.50, 150, 6), (105, 'Wireless Earbuds', 'Noise-cancelling earbuds with long battery life.', 129.00, 100, 1);

INSERT INTO product_images (id, product_id, image_url, alt_text) VALUES (1, 101, 'https://picsum.photos/id/1/500/500', 'Smartphone X front view'), (2, 101, 'https://picsum.photos/id/2/500/500', 'Smartphone X back view'), (3, 102, 'https://picsum.photos/id/3/500/500', 'Laptop Pro 15 open'), (4, 103, 'https://picsum.photos/id/4/500/500', 'The Great Adventure book cover'), (5, 104, 'https://picsum.photos/id/5/500/500', 'History of the World book cover'), (6, 105, 'https://picsum.photos/id/6/500/500', 'Wireless Earbuds in charging case');

INSERT INTO reviews (id, product_id, reviewer_name, rating, comment_text) VALUES (1, 101, 'Alice Smith', 5, 'Absolutely love this phone! The camera is incredible.'), (2, 101, 'Bob Johnson', 4, 'Great performance, but battery life could be better.'), (3, 102, 'Charlie Brown', 5, 'Powerful machine, perfect for my video editing tasks.'), (4, 103, 'Diana Prince', 4, 'Enjoyed the story, a bit slow in the middle.'), (5, 105, 'Eve Adams', 3, 'Decent sound, but they fall out of my ears sometimes.');

INSERT INTO comments (id, review_id, author_name, comment_text) VALUES (1, 1, 'Mallory', 'Agreed! The camera is a game-changer.'), (2, 2, 'Frank', 'Try optimizing some background apps for better battery.'), (3, 3, 'Grace', 'Thinking of buying this, good to hear it handles video editing well!');

SET FOREIGN_KEY_CHECKS = 1;
