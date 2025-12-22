import React from "react";
import { motion } from "framer-motion";
import {
  Info,
  Timer,
  Calculator,
  TrendingUp,
  Heart,
  Sparkles,
  CheckCircle,
  HeartCrack,
  TimerOff,
  LetterTextIcon,
  LucideAsterisk
} from "lucide-react";

export default function About() {
  const features = [
    {
      icon: Timer,
      title: "Таймер",
      description: "Установите обратный отсчет для объявлений, аукционов или напоминаний"
    },
    {
      icon: Calculator,
      title: "Отслеживание Операций",
      description: "Записывай транзакции, иЗаписывайте расходы, доходы и заметки, чтобы отслеживать прибыльность перепродажи"
    },
    {
      icon: TrendingUp,
      title: "Итоги В Реальном Времени",
      description: "Смотрите ваш чистый прибыль/убыток, рассчитываемый автоматически по мере добавления записей"
    },
    {
      icon: LucideAsterisk,
      title: "Будущие Функции Которые Вас Удивят",
      description: "ИИ для сотрудников Гос.Фракций, и не только"
    }
  ];

  const benefits = [
    "Не требуется регистрация — работает мгновенно",
    "Чистый интерфейс без отвлекающих элементов",
    "Удобный дизайн",
    "Быстрый и лёгкий"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Info className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">About</h1>
          </div>
          <p className="text-indigo-200">Learm more about us</p>
        </motion.div>
      </div>

      <div className="px-6 -mt-4">
        <div className="max-w-2xl mx-auto">
          {/* App Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 mb-6"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
              GTA 5 RP HELPER 
            </h2>
            <p className="text-slate-500 text-center mb-6">Version 1.0.0</p>

            <p className="text-slate-600 text-center leading-relaxed">
              Простой и элегантный инструмент, предназначенный для помощи перепродавцам в отслеживании их бизнес-операций
               с помощью удобных таймеров и калькулятора транзакций на GTA 5 RP.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Функции
            </h3>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4"
                >
                  <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                    <feature.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200"
          >
            <h3 className="font-semibold text-slate-900 mb-4">Почему именно мы?</h3>

            <div className="space-y-3">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Made with love */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-8"
          >
            <p className="text-slate-400 text-sm flex items-center justify-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-400 fill-red-400" /> for resellers everywhere
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
