-- Armenian terminology corrections (categories in products).
BEGIN;

UPDATE products SET category_hy = 'Մարքեթինգ' WHERE category_hy = 'Մարկետինգ';
UPDATE products SET category = 'Մարքեթինգ' WHERE category = 'Մարկետինգ';

UPDATE products SET category_hy = 'Սպասք լվացող մեքենաներ' WHERE category_hy = 'Ամանլվացքի մեքենաներ';
UPDATE products SET category = 'Սպասք լվացող մեքենաներ' WHERE category = 'Ամանլվացքի մեքենաներ';

UPDATE products SET category_hy = 'Կոմբայն հարիչներ' WHERE category_hy = 'Պլանետար միքսերներ';
UPDATE products SET category = 'Կոմբայն հարիչներ' WHERE category = 'Պլանետար միքսերներ';

UPDATE products SET category_hy = 'Ձեռքի հարիչներ' WHERE category_hy = 'Ձեռքի միքսերներ';
UPDATE products SET category = 'Ձեռքի հարիչներ' WHERE category = 'Ձեռքի միքսերներ';

UPDATE products SET category_hy = 'Այրման մակերեսներ' WHERE category_hy = 'Կերակրասալիկներ';
UPDATE products SET category = 'Այրման մակերեսներ' WHERE category = 'Կերակրասալիկներ';

UPDATE products SET category_hy = 'Ջեռոցներ' WHERE category_hy = 'Ջեռոց';
UPDATE products SET category = 'Ջեռոցներ' WHERE category = 'Ջեռոց';

UPDATE products SET category_hy = 'Էսպրեսո սուրճի մեքենաներ'
WHERE category_hy IN (
  'Էսպրեսո սրճեփ մեքենաներ',
  'Էսպրեսո սրճեփներ',
  'Էսպրեսո սրճեփ սարքեր',
  'Էսպրեսսոյի սրճեփ մեքենաներ',
  'Էսպրեսսո սրճեփ մեքենաներ',
  'Էսպրեսսո սրճեփներ',
  'Ներկառուցվող սրճեփ մեքենաներ'
);

UPDATE products SET category = 'Էսպրեսո սուրճի մեքենաներ'
WHERE category IN (
  'Էսպրեսո սրճեփ մեքենաներ',
  'Էսպրեսո սրճեփներ',
  'Էսպրեսո սրճեփ սարքեր',
  'Էսպրեսսոյի սրճեփ մեքենաներ',
  'Էսպրեսսո սրճեփ մեքենաներ',
  'Էսպրեսսո սրճեփներ',
  'Ներկառուցվող սրճեփ մեքենաներ'
);

COMMIT;
