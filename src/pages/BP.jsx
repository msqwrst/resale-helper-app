import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";

const TASKS = [
  // Актуальные для всех способы фарма
  { id: "online_3h", title: "3 часа в онлайне (можно выполнять многократно за день)", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "casino_zeros", title: "Нули в казино", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "construction_25", title: "25 действий на стройке", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "port_25", title: "25 действий в порту", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "mine_25", title: "25 действий в шахте", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "dance_3wins", title: "3 победы в Дэнс Баттлах", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "biz_materials", title: "Заказ материалов для бизнеса вручную (просто прожать вкл/выкл)", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "gym_20", title: "20 подходов в тренажерном зале", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "range_training", title: "Успешная тренировка в тире", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "post_10", title: "10 посылок на почте", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "rent_studio", title: "Арендовать киностудию", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "lottery_ticket", title: "Купить лотерейный билет", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "karting_race", title: "Выиграть гонку в картинге", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "farm_10actions", title: "10 действий на ферме (10 коров, 10 пшеницы и т.д. — один любой способ в день)", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "firefighter_25", title: 'Потушить 25 "огоньков" пожарным', bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "treasure_1", title: "Выкопать 1 сокровище (не мусор)", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "street_race_1", title: "Проехать 1 уличную гонку (через регистрацию в телефоне, ставка минимум 1000$)", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "truck_3orders", title: "Выполнить 3 заказа дальнобойщиком", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "ems_surgery_2", title: "Два раза оплатить смену внешности у хирурга в EMS", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "cinema_add_5", title: "Добавить 5 видео в кинотеатре", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "training_complex_5wins", title: "Выиграть 5 игр в тренировочном комплексе со ставкой (от 100$)", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "arena_3wins", title: "Выиграть 3 любых игры на арене со ставкой (от 100$)", bpBase: 1, bpPlat: 2, group: "Актуальные" },
  { id: "bus_2laps", title: "2 круга на любом маршруте автобусника", bpBase: 2, bpPlat: 4, group: "Актуальные" },
  { id: "animals_skin_5", title: "5 раз снять 100% шкуру с животных", bpBase: 2, bpPlat: 4, group: "Актуальные" },

  // НОВОЕ с 20.10.2025
  { id: "browser_site", title: "Посетить любой сайт в браузере", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "brawl_channel", title: "Зайти в любой канал в Brawl", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "match_like", title: "Поставить лайк любой анкете в Match", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "dp_case_spin", title: "Прокрутить за DP серебрянный, золотой или driver кейс", bpBase: 10, bpPlat: 20, group: "Новое (20.10.2025)" },
  { id: "pet_ball_15", title: "Кинуть мяч питомцу 15 раз", bpBase: 2, bpPlat: 4, group: "Новое (20.10.2025)" },
  { id: "pet_commands_15", title: "15 выполненных питомцем команд", bpBase: 2, bpPlat: 4, group: "Новое (20.10.2025)" },
  { id: "casino_wheel_bet", title: "Ставка в колесе удачи в казино (межсерверное колесо)", bpBase: 3, bpPlat: 6, group: "Новое (20.10.2025)" },
  { id: "metro_1station", title: "Проехать 1 станцию на метро", bpBase: 2, bpPlat: 4, group: "Новое (20.10.2025)" },
  { id: "fish_20", title: "Поймать 20 рыб", bpBase: 4, bpPlat: 8, group: "Новое (20.10.2025)" },
  { id: "clubs_2quests", title: "Выполнить 2 квеста любых клубов", bpBase: 4, bpPlat: 8, group: "Новое (20.10.2025)" },
  { id: "autoservice_part", title: "Починить деталь в автосервисе", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "basketball_2", title: "Забросить 2 мяча в баскетболе", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "football_2goals", title: "Забить 2 гола в футболе", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "armwrestling_win", title: "Победить в армрестлинге", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "darts_win", title: "Победить в дартс", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "volleyball_1min", title: "Поиграть 1 минуту в волейбол", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "pingpong_1min", title: "Поиграть 1 минуту в настольный теннис", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "tennis_1min", title: "Поиграть 1 минуту в большой теннис", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "casino_mafia", title: "Сыграть в мафию в казино", bpBase: 3, bpPlat: 6, group: "Новое (20.10.2025)" },
  { id: "leasing_payment", title: "Сделать платеж по лизингу", bpBase: 1, bpPlat: 2, group: "Новое (20.10.2025)" },
  { id: "weed_greenhouse", title: "Посадить траву в теплице", bpBase: 4, bpPlat: 8, group: "Новое (20.10.2025)" },
  { id: "lab_painkillers", title: "Запустить переработку обезболивающих в лаборатории", bpBase: 4, bpPlat: 8, group: "Новое (20.10.2025)" },
  { id: "airdrops_2", title: "Принять участие в двух аирдропах", bpBase: 4, bpPlat: 8, group: "Новое (20.10.2025)" },
];

export default function BP() {
  const [query, setQuery] = useState("");
  const [platinum, setPlatinum] = useState(false);
  const [done, setDone] = useState(() => new Set()); // ids

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TASKS;
    return TASKS.filter(
      (t) => t.title.toLowerCase().includes(q) || t.group.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      if (!map.has(t.group)) map.set(t.group, []);
      map.get(t.group).push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totals = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const id of done) {
      const t = TASKS.find((x) => x.id === id);
      if (!t) continue;
      total += platinum ? t.bpPlat : t.bpBase;
      count += 1;
    }
    return { total, count };
  }, [done, platinum]);

  const toggleDone = useCallback((id) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearAll = () => setDone(new Set());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold">BP фарм</h1>
              </div>
              <p className="text-indigo-100">
                Отмечай задания — приложение считает BP автоматически. Включи Platinum VIP и
                значения переключатся.
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-indigo-100">Выбрано</div>
              <div className="text-3xl font-bold leading-none tabular-nums">
                {totals.total} BP
              </div>
              <div className="text-xs text-indigo-200 mt-1">{totals.count} заданий</div>
            </div>
          </div>

          {/* Controls row */}
          <div className="mt-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-3 bg-white/15 rounded-2xl px-4 py-3">
              <div className="text-sm font-semibold">Platinum VIP</div>
              <Switch checked={platinum} onCheckedChange={setPlatinum} />
              <div className="text-xs text-indigo-100">{platinum ? "x2 BP активен" : "обычные BP"}</div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="bg-white/15 text-white hover:bg-white/20 border border-white/15"
                onClick={clearAll}
                disabled={done.size === 0}
                title="Снять все галочки"
              >
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Сбросить всё
                </span>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по заданиям… (например: казино, метро, рыба)"
                className="pl-9 bg-white/15 border-white/15 text-white placeholder:text-white/60"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-4">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="popLayout">
            {grouped.map(([groupName, items]) => (
              <motion.div
                key={groupName}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5 mb-4"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="font-bold text-slate-900">{groupName}</h2>
                  <Badge variant="secondary" className="rounded-xl">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {items.map((t) => {
                    const checked = done.has(t.id);
                    const bp = platinum ? t.bpPlat : t.bpBase;

                    return (
                      <motion.div
                        key={t.id}
                        layout
                        onClick={() => toggleDone(t.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            toggleDone(t.id);
                          }
                          if (e.key === " ") {
                            e.preventDefault();
                            if (e.repeat) return;
                            toggleDone(t.id);
                          }
                        }}
                        className={`cursor-pointer select-none flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                          checked
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        {/* STOP propagation so checkbox click doesn't toggle twice */}
                        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleDone(t.id)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-medium text-slate-900 leading-snug">{t.title}</div>

                            <div className="shrink-0 text-right">
                              <motion.div
                                key={platinum ? `plat_${t.id}` : `base_${t.id}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`text-sm font-bold tabular-nums ${
                                  platinum ? "text-purple-700" : "text-indigo-700"
                                }`}
                              >
                                +{bp} BP
                              </motion.div>

                              {checked && (
                                <div className="text-xs text-emerald-700 inline-flex items-center gap-1 justify-end">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  выполнено
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center text-slate-500 mt-10">
              Ничего не найдено по запросу: <span className="font-semibold">{query}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
