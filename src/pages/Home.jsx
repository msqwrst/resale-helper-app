import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Timer, Calculator, Sparkles, ArrowRight, TrendingUp } from "lucide-react";

export default function Home() {
  const tools = [
    {
    title: "BP",
      description: "Получайте BP за игровые задания",
      icon: Timer,
      color: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      page: "BP"
    },
    {
      title: "Таймер",
      description: "Установите обратный отсчет для объявлений, аукционов или напоминаний",
      icon: Timer,
      color: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      page: "Timer"
    },
    {
      title: "Калькулятор",
      description: "Отслеживайте свои расходы, прибыль и сделки от перепродажи",
      icon: Calculator,
      color: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      page: "Calculator"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />

        <div className="relative px-6 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Ваш спутник в бизнесе перепродажи
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4"
            >
              Добро пожаловать в{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              RESALE GTA5RP
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-slate-600 mb-8"
            >
              Выберите инструмент в меню или начните с быстрого доступа ниже.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-8 text-center"
            >
              <div>
                <div className="text-2xl font-bold text-slate-900">2</div>
                <div className="text-sm text-slate-500">Tools</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div>
                <div className="text-2xl font-bold text-slate-900">∞</div>
                <div className="text-sm text-slate-500">Calculations</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div>
                <div className="text-2xl font-bold text-slate-900">Free</div>
                <div className="text-sm text-slate-500">Forever</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Tools */}
      <div className="px-6">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6"
          >
            Быстрый доступ
          </motion.h2>

          <div className="grid gap-4">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + index * 0.1 }}
              >
                <Link to={createPageUrl(tool.page)}>
                  <div className="group relative bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${tool.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}
                    />
                    <div className="relative flex items-start gap-4">
                      <div className={`${tool.iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                        <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                          {tool.title}
                          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{tool.description}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Tip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-xl border border-indigo-100">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">Совет</div>
                <div className="text-sm text-slate-600">
                  Используйте калькулятор для записи всех расходов (доставка, сборы, материалы), чтобы всегда знать свою реальную прибыль.
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
