-- Run in Lovable Cloud → SQL editor. Copy each result set as JSON
-- and save to deploy/data/export/ on your machine:
--   collections.json, partners.json, profiles.json, user_roles.json, orders.json, order_items.json

SELECT json_agg(t) FROM (SELECT * FROM collections ORDER BY slug) t;
SELECT json_agg(t) FROM (SELECT * FROM partners) t;
SELECT json_agg(t) FROM (SELECT id, full_name, telegram_chat_id, created_at, updated_at FROM profiles) t;
SELECT json_agg(t) FROM (SELECT * FROM user_roles) t;
SELECT json_agg(t) FROM (SELECT * FROM orders) t;
SELECT json_agg(t) FROM (SELECT * FROM order_items) t;
