'use client';

import { useEffect } from 'react';

/**
 * Один наблюдатель на всё приложение:
 * [data-reveal] — блок плавно поднимается при появлении на экране (один раз);
 * [data-count]  — число досчитывает от нуля, когда блок показался;
 * .words > span — слова слогана проявляются по одному, пересекая линию на 62% высоты экрана.
 * Разметка остаётся серверной. Скрытое состояние включает класс js из layout,
 * а если скрипт не загрузится, CSS сам покажет блоки через пару секунд.
 */
export function Motion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instant = reduced || navigator.webdriver;
    const fmt = new Intl.NumberFormat('ru-RU');

    const countUp = (el: HTMLElement) => {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const to = Number(el.dataset.count);
      const suffix = el.dataset.suffix ?? '';
      if (!Number.isFinite(to) || instant || to === 0) return;
      const dur = Math.min(1600, 700 + Math.log10(Math.abs(to) + 1) * 260);
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt.format(Math.round(to * eased)) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0' + suffix;
      requestAnimationFrame(tick);
    };

    const show = (el: Element) => {
      el.classList.add('in');
      if (el instanceof HTMLElement && el.dataset.count !== undefined) countUp(el);
      el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        show(e.target);
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    const wordIo = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('on', e.isIntersecting || e.boundingClientRect.top < 0);
    }, { rootMargin: '0px 0px -38% 0px', threshold: 0 });

    const scan = (scope: ParentNode) => {
      scope.querySelectorAll('[data-reveal]:not(.in), [data-count]:not([data-counted])').forEach((el) => {
        if (instant) show(el);
        else if (!(el as HTMLElement).dataset.watched) {
          (el as HTMLElement).dataset.watched = '1';
          io.observe(el);
        }
      });
      scope.querySelectorAll('.words > span:not([data-watched])').forEach((el) => {
        (el as HTMLElement).dataset.watched = '1';
        if (instant) el.classList.add('on');
        else wordIo.observe(el);
      });
    };

    scan(document);
    const mo = new MutationObserver((list) => {
      for (const m of list) m.addedNodes.forEach((n) => { if (n instanceof Element) scan(n.parentNode ?? n); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); wordIo.disconnect(); mo.disconnect(); };
  }, []);

  return null;
}
