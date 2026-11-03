-- Явная пометка синтетических внешних метрик для кейс-чемпионата.
-- Уже существующие строки считаются фактическими; ничего не перезаписываем.
alter table metrics add column if not exists is_demo boolean not null default false;
comment on column metrics.is_demo is 'true: модельные демонстрационные значения, не фактическая отчетность';
