import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calculator as CalcIcon,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ListFilter
} from "lucide-react";
import { format } from "date-fns";

export default function Calculator() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("all"); // all | positive | negative

  const handleSave = () => {
    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value)) return;

    const newEntry = {
      id: Date.now(),
      amount: value,
      note: note.trim() || "Без записи",
      timestamp: new Date().toISOString()
    };

    setEntries((prev) => [newEntry, ...prev]);
    setAmount("");
    setNote("");
  };

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc.total += e.amount;
        if (e.amount > 0) acc.positive += e.amount;
        if (e.amount < 0) acc.negative += Math.abs(e.amount);
        return acc;
      },
      { total: 0, positive: 0, negative: 0 }
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filter === "positive") return e.amount > 0;
      if (filter === "negative") return e.amount < 0;
      return true;
    });
  }, [entries, filter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <CalcIcon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Калькулятор</h1>
          </div>
          <p className="text-amber-100">Отслеживайте свои расходы, прибыль и сделки от перепродажи</p>
        </motion.div>
      </div>

      <div className="px-6 -mt-4">
        <div className="max-w-2xl mx-auto">
          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <ListFilter className="w-3 h-3" />
                Записи
              </div>
              <div className="text-2xl font-bold text-slate-900">{entries.length}</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Доход
              </div>
              <div className="text-2xl font-bold text-emerald-600">${totals.positive.toFixed(2)}</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
                <TrendingDown className="w-3 h-3" />
                Расход/Траты
              </div>
              <div className="text-2xl font-bold text-red-500">${totals.negative.toFixed(2)}</div>
            </div>
          </motion.div>

          {/* Net */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`rounded-2xl p-5 mb-6 ${
              totals.total >= 0
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-gradient-to-r from-red-500 to-rose-500"
            }`}
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <div className="text-sm opacity-80 mb-1">Ваш доход составляет:</div>
                <div className="text-3xl font-bold">
                  {totals.total >= 0 ? "+" : "-"}${Math.abs(totals.total).toFixed(2)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/20">
                {totals.total >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 mb-6"
          >
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              Добавить запись
            </h3>

            <div className="grid gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Сумма</div>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="например: 23.56"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Запись</div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="например: сумка, продал вещь..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                Сохранить запись
              </Button>
            </div>
          </motion.div>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            {[
              { id: "all", label: "Все" },
              { id: "positive", label: "Доход" },
              { id: "negative", label: "Расход/Траты" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                  filter === f.id
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Entries */}
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-6">
                Пока нет записей. Добавьте свою первую транзакцию выше.
              </div>
            ) : (
              filteredEntries.map((e) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`text-lg font-bold ${e.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {e.amount >= 0 ? "+" : "-"}${Math.abs(e.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(new Date(e.timestamp), "MMM d, yyyy • HH:mm")}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 mt-1 break-words">{e.note}</div>
                  </div>

                  <button
                    onClick={() => handleDelete(e.id)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-slate-600" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
