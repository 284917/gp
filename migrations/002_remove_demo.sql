-- Переход в рабочий режим: удаляем демонстрационные данные.
-- Вместе с демо-пользователями каскадно удаляются их сдачи заданий, уведомления,
-- начисления и заявки на награды. Настоящие аккаунты и справочники остаются.

update users set mentor_id = null where mentor_id in (select id from users where is_demo);

delete from users where is_demo;

-- Архивные задания демо-сезона, по которым не осталось ни одной сдачи
delete from tasks t
where not t.active
  and t.why = 'Задание прошлого спринта.'
  and not exists (select 1 from submissions s where s.task_id = t.id);

-- Демо-метрики: дальше их вносят кураторы
delete from metrics;
