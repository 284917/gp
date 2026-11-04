-- Карьерная мотивация без привилегий при отборе: консультации, встречи с экспертами
-- и помощь в подготовке к отбору на практику. Отбор проходит на общих условиях.
insert into rewards (title, category, cost, min_level, audience, note, sort)
select v.title, v.category, v.cost, v.min_level, v.audience, v.note, (select coalesce(max(sort), 0) from rewards) + v.n
from (values
  (1, 'Карьерная консультация с HR: резюме и план развития', 'Карьера', 300, 2, 'all', null),
  (2, 'Встреча с экспертом вашей будущей профессии', 'Карьера', 300, 2, 'external', null),
  (3, 'Пробное собеседование перед отбором на практику', 'Карьера', 400, 2, 'external', 'отбор на общих условиях')
) as v(n, title, category, cost, min_level, audience, note)
-- в пустую базу каталог целиком положит scripts/seed.mjs
where exists (select 1 from rewards)
  and not exists (select 1 from rewards r where r.title = v.title);
