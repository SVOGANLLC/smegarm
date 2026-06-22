-- product-media must be public: admin uploads use getPublicUrl for covers and page banners.
UPDATE storage.buckets SET public = true WHERE id = 'product-media';
