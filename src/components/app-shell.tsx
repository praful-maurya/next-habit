"use client";

import Link from "next/link";
import {
  Activity,
  Apple,
  Award,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  Coffee,
  Copy,
  Flame,
  Gift,
  Heart,
  Leaf,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { format } from "date-fns";
import type { DashboardSnapshot, FoodItem } from "@/lib/types";
import { monthLabel, previousDate, weekdayFromString } from "@/lib/dates";
import { calculateNutrition } from "@/lib/nutrition";
import SignOutButton from "@/components/sign-out-button";

type Section = "home" | "habits" | "calendar" | "journal" | "diet" | "rewards" | "analytics" | "review";

const navigation: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: "home", label: "Overview", icon: Activity },
  { id: "habits", label: "My habits", icon: CheckCheck },
  { id: "calendar", label: "Habit calendar", icon: CalendarDays },
  { id: "journal", label: "Daily journal", icon: NotebookPen },
  { id: "diet", label: "Food & nutrition", icon: Apple },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "review", label: "Weekly review", icon: BookOpen },
];

const morningPrompts = [
  ["priorities", "My three priorities today"],
  ["improve", "One thing I want to improve"],
  ["goal", "My main goal today"],
];
const eveningPrompts = [
  ["wins", "What went well today?"],
  ["better", "What could I have done better?"],
  ["grateful", "What am I grateful for?"],
];
const reviewPrompts = [
  ["wins", "What were your biggest wins this week?"],
  ["easyHabits", "Which habits felt easiest to maintain?"],
  ["missedHabits", "Which habits did you miss most often?"],
  ["distractions", "What distractions showed up?"],
  ["lessons", "What did you learn about yourself?"],
  ["nextWeek", "What would you like to focus on next week?"],
  ["logging", "How consistently did you record meals?"],
  ["calories", "How did your logged calories compare with your target?"],
  ["protein", "How did your logged protein compare with your target?"],
  ["nutritionHabit", "What nutrition habit would you like to improve?"],
];
const meals = ["Breakfast", "Morning snack", "Lunch", "Evening snack", "Dinner", "Other"];
const streakMilestones = [
  { days: 1, label: "First day" },
  { days: 7, label: "A week of care" },
  { days: 30, label: "A month of practice" },
];

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);
}

function friendlyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function currentGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function subscribeToGreeting(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", onChange);
  };
}

function serverGreeting() {
  return "Welcome back";
}

function IconForHabit({ name }: { name: string }) {
  const icons: Record<string, typeof Activity> = {
    activity: Activity,
    "book-open": BookOpen,
    "list-checks": CheckCheck,
    "notebook-pen": NotebookPen,
    coffee: Coffee,
    gift: Gift,
    "clapperboard": Sparkles,
  };
  const Icon = icons[name] ?? Sprout;
  return <Icon size={18} strokeWidth={1.8} aria-hidden="true" />;
}

function ProgressRing({ value, label, tone = "calories" }: { value: number; label: string; tone?: "calories" | "habits" }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`progress-ring progress-ring-${tone}`}
      style={{ "--progress": `${safeValue}%` } as React.CSSProperties}
      role="img"
      aria-label={`${Math.round(safeValue)} percent ${label}`}
    >
      <div className="progress-ring-center">
        <strong>{Math.round(safeValue)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function AppShell({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [section, setSection] = useState<Section>("home");
  const [selectedDate, setSelectedDate] = useState(initialSnapshot.date);
  const [analyticsRange, setAnalyticsRange] = useState(7);
  const greeting = useSyncExternalStore(subscribeToGreeting, currentGreeting, serverGreeting);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [foodName, setFoodName] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("100");
  const [foodUnit, setFoodUnit] = useState("g");
  const [foodBasis, setFoodBasis] = useState<"100g" | "serving">("100g");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodMeal, setFoodMeal] = useState("Lunch");
  const [foodNotes, setFoodNotes] = useState("");
  const [saveCustomFood, setSaveCustomFood] = useState(false);
  const [editingLogId, setEditingLogId] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingMeal, setEditingMeal] = useState("Lunch");
  const [targetCalories, setTargetCalories] = useState("2200");
  const [targetProtein, setTargetProtein] = useState("120");
  const [morning, setMorning] = useState<Record<string, string>>({});
  const [evening, setEvening] = useState<Record<string, string>>({});
  const [freeWrite, setFreeWrite] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({});
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [habitCategory, setHabitCategory] = useState("Personal Growth");
  const [habitPoints, setHabitPoints] = useState("10");

  const loadSnapshot = useCallback(async (date: string, range = analyticsRange) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard?date=${date}&range=${range}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load your journal.");
      setSnapshot(data as DashboardSnapshot);
      setTargetCalories(String(data.caloriesTarget));
      setTargetProtein(String(data.proteinTarget));
      setMorning(data.journal?.morning ?? {});
      setEvening(data.journal?.evening ?? {});
      setFreeWrite(data.journal?.freeWrite ?? "");
      setMood(data.journal?.mood ?? "");
      setEnergy(data.journal?.energy ?? null);
      setReviewAnswers(data.weeklyReview ?? {});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your journal.");
    } finally {
      setLoading(false);
    }
  }, [analyticsRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSnapshot(selectedDate), 0);
    return () => window.clearTimeout(timer);
  }, [loadSnapshot, selectedDate]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  const submit = async (url: string, method: string, body: unknown) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The change could not be saved.");
      await loadSnapshot(selectedDate);
      setNotice("Saved just now");
      window.setTimeout(() => setNotice(""), 2500);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The change could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const scheduledHabits = useMemo(() => {
    const today = weekdayFromString(selectedDate);
    return snapshot.habits.filter((habit) => habit.status === "ACTIVE" && habit.weekdays.includes(today));
  }, [selectedDate, snapshot.habits]);
  const completedHabits = scheduledHabits.filter((habit) => habit.completed).length;
  const habitPercent = scheduledHabits.length ? (completedHabits / scheduledHabits.length) * 100 : 0;
  const calories = snapshot.foodLogs.reduce((sum, entry) => sum + entry.calories, 0);
  const protein = snapshot.foodLogs.reduce((sum, entry) => sum + entry.protein, 0);
  const caloriesRemaining = Math.max(0, snapshot.caloriesTarget - calories);
  const proteinRemaining = Math.max(0, snapshot.proteinTarget - protein);
  const caloriePercent = snapshot.caloriesTarget > 0 ? (calories / snapshot.caloriesTarget) * 100 : 0;
  const proteinPercent = snapshot.proteinTarget > 0 ? (protein / snapshot.proteinTarget) * 100 : 0;
  const entryPreview = calculateNutrition(
    Number(foodQuantity) || 0,
    foodBasis,
    Number(foodCalories) || 0,
    Number(foodProtein) || 0,
  );
  const filteredFoods = snapshot.foods.filter((food) =>
    `${food.name} ${food.category}`.toLowerCase().includes(foodSearch.toLowerCase()),
  );
  const recordedDays = snapshot.trend.filter((day) => day.calories !== null);
  const averageCalories = recordedDays.length
    ? recordedDays.reduce((total, day) => total + (day.calories ?? 0), 0) / recordedDays.length
    : null;
  const averageProtein = recordedDays.length
    ? recordedDays.reduce((total, day) => total + (day.protein ?? 0), 0) / recordedDays.length
    : null;
  const weeklyRecordedDays = snapshot.trend.filter((day) => day.date >= previousDate(selectedDate, 6) && day.calories !== null);
  const weeklyAverageCalories = weeklyRecordedDays.length
    ? weeklyRecordedDays.reduce((total, day) => total + (day.calories ?? 0), 0) / weeklyRecordedDays.length
    : null;
  const rankedHabits = [...snapshot.habitPerformance]
    .filter((habit) => habit.scheduled > 0)
    .sort((a, b) => b.completed / b.scheduled - a.completed / a.scheduled);
  const nextStreakMilestone = streakMilestones.find((milestone) => milestone.days > snapshot.streaks.longest);
  const activeMonth = selectedDate.slice(0, 7);
  const calendarCells = useMemo(() => {
    const firstDay = `${activeMonth}-01`;
    const padding = weekdayFromString(firstDay);
    return [...Array.from({ length: padding }, () => null), ...snapshot.calendar];
  }, [activeMonth, snapshot.calendar]);

  const chooseFood = (food: FoodItem) => {
    setSelectedFoodId(food.id);
    setFoodName(food.name);
    setFoodCalories(String(food.calories));
    setFoodProtein(String(food.protein));
    setFoodBasis(food.basis === "serving" ? "serving" : "100g");
    setFoodUnit(food.basis === "serving" ? food.servingUnit : "g");
  };

  const addFood = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(foodQuantity);
    const caloriesPerBasis = Number(foodCalories);
    const proteinPerBasis = Number(foodProtein);
    if (!foodName.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(caloriesPerBasis) || !Number.isFinite(proteinPerBasis)) {
      setError("Enter a food name, a positive quantity, calories, and protein.");
      return;
    }
    const saved = await submit("/api/food-logs", "POST", {
      date: selectedDate,
      foodName: foodName.trim(),
      meal: foodMeal,
      quantity,
      unit: foodBasis === "100g" ? "g" : foodUnit || "serving",
      basis: foodBasis,
      caloriesPerBasis,
      proteinPerBasis,
      notes: foodNotes,
      foodId: selectedFoodId || undefined,
      saveFood: saveCustomFood,
    });
    if (saved) {
      setFoodSearch("");
      setSelectedFoodId("");
      setFoodName("");
      setFoodQuantity("100");
      setFoodCalories("");
      setFoodProtein("");
      setFoodNotes("");
      setSaveCustomFood(false);
    }
  };

  const saveJournal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit("/api/journal", "PUT", { date: selectedDate, morning, evening, freeWrite, mood, energy });
  };

  const saveWeeklyReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit("/api/weekly-review", "PUT", { date: selectedDate, answers: reviewAnswers });
  };

  const saveTargets = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit("/api/targets", "PUT", {
      calories: Number(targetCalories),
      protein: Number(targetProtein),
    });
  };

  const toggleHabit = async (habit: DashboardSnapshot["habits"][number]) => {
    setBusyId(habit.id);
    const didSave = await submit("/api/habit-completion", "POST", {
      habitId: habit.id,
      date: selectedDate,
      completed: !habit.completed,
      requestId: crypto.randomUUID(),
    });
    if (didSave) setNotice(habit.completed ? "Completion undone" : `+${habit.points} points earned`);
    setBusyId("");
  };

  const deleteFood = async (id: string) => {
    setBusyId(id);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/food-logs/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete food entry.");
      await loadSnapshot(selectedDate);
      setNotice("Food entry removed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete food entry.");
    } finally {
      setSaving(false);
      setBusyId("");
    }
  };

  const startEditingFood = (entry: DashboardSnapshot["foodLogs"][number]) => {
    setEditingLogId(entry.id);
    setEditingQuantity(String(entry.quantity));
    setEditingMeal(entry.meal);
  };

  const saveFoodEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLogId) return;
    const saved = await submit(`/api/food-logs/${editingLogId}`, "PATCH", {
      quantity: Number(editingQuantity),
      meal: editingMeal,
    });
    if (saved) setEditingLogId("");
  };

  const duplicateFood = async (id: string) => {
    await submit(`/api/food-logs/${id}`, "POST", { date: selectedDate });
  };

  const redeemReward = async (rewardId: string) => {
    await submit("/api/redeem", "POST", { rewardId, requestId: crypto.randomUUID() });
  };

  const addHabit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!habitName.trim()) return;
    const created = await submit("/api/habits", "POST", {
      name: habitName.trim(),
      category: habitCategory,
      points: Number(habitPoints),
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    });
    if (created) {
      setHabitName("");
      setHabitFormOpen(false);
    }
  };

  const updateHabitStatus = async (habitId: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED") => {
    await submit(`/api/habits/${habitId}`, "PATCH", { status });
  };

  const changeMonth = (direction: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setMonth(date.getMonth() + direction, 1);
    setSelectedDate(format(date, "yyyy-MM-dd"));
  };

  const selectSection = (id: Section) => {
    setSection(id);
    setMobileNavOpen(false);
  };

  const todayLabel = friendlyDate(selectedDate);

  const firstName = snapshot.displayName.trim().split(/\s+/)[0] || "Friend";

  return (
    <div className={`app-frame ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sprout size={21} /></div>
          <div><span>THE DAILY</span><strong>Practice</strong></div>
          <button
            className="desktop-sidebar-toggle icon-button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            type="button"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button className="mobile-close icon-button" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X size={19} /></button>
        </div>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav id="primary-navigation" className="side-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${section === id ? "active" : ""}`} title={sidebarCollapsed ? label : undefined} aria-label={sidebarCollapsed ? label : undefined} aria-current={section === id ? "page" : undefined} onClick={() => selectSection(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === "habits" && <span className="nav-count">{completedHabits}/{scheduledHabits.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <div className="quote-flower"><Leaf size={17} /></div>
            <p>Small steps, repeated daily, create remarkable change.</p>
            <span>YOUR DAILY REMINDER</span>
          </div>
          <Link href="/settings" className="profile-chip" aria-label="Account settings">
            <div className="profile-avatar">{(snapshot.displayName || "Friend").charAt(0).toUpperCase()}</div>
            <div className="profile-details"><strong>{snapshot.displayName || "Friend"}</strong><span>Account settings</span></div>
            <MoreHorizontal size={19} className="profile-more" />
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} tabIndex={-1} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" aria-expanded={mobileNavOpen} aria-controls="primary-navigation" onClick={() => setMobileNavOpen(true)}><Menu size={21} /></button>
          <div className="crumb">Your journal <span>/</span> <strong>{navigation.find((item) => item.id === section)?.label}</strong></div>
          <div className="topbar-right">
            {notice && <span className="saved-indicator"><span />{notice}</span>}
            <label className="date-select"><CalendarDays size={16} /><input aria-label="Selected date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
            <Link href="/settings" className="top-avatar" aria-label="Account settings">{(snapshot.displayName || "Friend").charAt(0).toUpperCase()}</Link>
          </div>
        </header>

        <div className="content-wrap">
          {!snapshot.configured && !loading && (
            <div className="setup-banner">
              <div><strong>Connect your journal database</strong><span>Add DATABASE_URL to .env and run <code>npx prisma migrate dev --name init</code> to save entries between visits.</span></div>
              <span className="setup-badge">SETUP REQUIRED</span>
            </div>
          )}
          {error && <div role="alert" className="alert-banner"><span>{error}</span><button className="icon-button" onClick={() => setError("")} aria-label="Dismiss"><X size={17} /></button></div>}
          {loading && <div className="loading-line"><LoaderCircle className="spin" size={17} /> Updating your journal…</div>}

          {section === "home" && (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow"><span className="eyebrow-dot" /> {todayLabel}</p>
                  <h1>{greeting}, <em>{firstName}.</em></h1>
                  <p className="welcome-subtitle">A little progress each day adds up to something wonderful.</p>
                </div>
                <div className="welcome-metrics">
                  <div className="welcome-progress">
                    <ProgressRing value={habitPercent} label="done" tone="habits" />
                    <div><strong>Daily progress</strong><span>{completedHabits} of {scheduledHabits.length} habits complete</span></div>
                  </div>
                  <div className="streak-pill"><div className="streak-icon"><Flame size={19} /></div><div><strong>{snapshot.streaks.current} {snapshot.streaks.current === 1 ? "day" : "days"}</strong><span>current streak · best {snapshot.streaks.longest}d</span></div></div>
                </div>
              </section>

              <section className="stats-grid" aria-label="Today's progress">
                <article className="stat-card habit-stat">
                  <div className="stat-heading"><span>DAILY PRACTICE</span><div className="stat-icon sage"><CheckCheck size={17} /></div></div>
                  <div className="stat-main"><strong>{completedHabits}<small> / {scheduledHabits.length}</small></strong><span>habits complete</span></div>
                  <div className="thin-progress"><span style={{ width: `${habitPercent}%` }} /></div>
                  <div className="stat-foot"><span>{Math.round(habitPercent)}% complete</span><button onClick={() => selectSection("habits")}>View habits <ArrowRight size={13} /></button></div>
                </article>
                <article className="stat-card">
                  <div className="stat-heading"><span>NOURISHMENT</span><div className="stat-icon peach"><Apple size={17} /></div></div>
                  <div className="stat-main"><strong>{formatNumber(calories)}<small> kcal</small></strong><span>of {formatNumber(snapshot.caloriesTarget)} kcal goal</span></div>
                  <div className="thin-progress peach-track"><span style={{ width: `${Math.min(100, caloriePercent)}%` }} /></div>
                  <div className="stat-foot"><span>{formatNumber(caloriesRemaining)} kcal remaining</span><button onClick={() => selectSection("diet")}>Food diary <ArrowRight size={13} /></button></div>
                </article>
                <article className="stat-card">
                  <div className="stat-heading"><span>POINTS BANK</span><div className="stat-icon gold"><Sparkles size={17} /></div></div>
                  <div className="stat-main"><strong>{formatNumber(snapshot.points)}<small> pts</small></strong><span>earned through consistency</span></div>
                  <div className="points-deco"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
                  <div className="stat-foot"><span>Keep showing up for yourself</span><button onClick={() => selectSection("rewards")}>Explore rewards <ArrowRight size={13} /></button></div>
                </article>
                <article className="stat-card">
                  <div className="stat-heading"><span>WEEKLY CONSISTENCY</span><div className="stat-icon sage"><CalendarDays size={17} /></div></div>
                  <div className="stat-main"><strong>{snapshot.weeklyConsistency === null ? "—" : snapshot.weeklyConsistency}<small>{snapshot.weeklyConsistency === null ? "" : "%"}</small></strong><span>{snapshot.weeklyCompleted} of {snapshot.weeklyScheduled} practices this week</span></div>
                  <div className="thin-progress"><span style={{ width: `${snapshot.weeklyConsistency ?? 0}%` }} /></div>
                  <div className="stat-foot"><span>{snapshot.journal ? "Reflection saved today" : "No reflection saved today"}</span><button onClick={() => selectSection("journal")}>Journal <ArrowRight size={13} /></button></div>
                </article>
              </section>

              <section className="dashboard-grid">
                <article className="panel-card today-card">
                  <div className="panel-heading"><div><p className="eyebrow">ONE DAY AT A TIME</p><h2>Today&apos;s practice</h2></div><button className="text-action" onClick={() => selectSection("habits")}>All habits <ArrowRight size={15} /></button></div>
                  <div className="habit-list">
                    {scheduledHabits.length === 0 ? <div className="empty-inline"><Sprout size={21} /><span>No habits scheduled for this day. Take a breath or set a new intention.</span></div> :
                      scheduledHabits.slice(0, 5).map((habit) => (
                        <div key={habit.id} className={`habit-row ${habit.completed ? "is-done" : ""}`}>
                          <button className={`habit-check ${habit.completed ? "checked" : ""}`} disabled={busyId === habit.id || !snapshot.configured || loading} aria-label={`${habit.completed ? "Undo" : "Complete"} ${habit.name}`} onClick={() => void toggleHabit(habit)}>
                            {busyId === habit.id ? <LoaderCircle size={17} className="spin" /> : habit.completed ? <Check size={16} /> : <Circle size={17} />}
                          </button>
                          <span className="habit-icon"><IconForHabit name={habit.icon} /></span>
                          <div className="habit-info"><strong>{habit.name}</strong><span>{habit.category}</span></div>
                          <span className="habit-points">+{habit.points} <small>pts</small></span>
                        </div>
                      ))}
                  </div>
                  {scheduledHabits.length > 0 && <button className="add-habit-link" onClick={() => selectSection("habits")}><Plus size={16} /> Add or manage habits</button>}
                </article>

                <article className="panel-card nutrition-card">
                  <div className="panel-heading"><div><p className="eyebrow">FUEL FOR YOUR DAY</p><h2>Nutrition</h2></div><button className="circle-link" aria-label="Open food diary" onClick={() => selectSection("diet")}><ArrowRight size={16} /></button></div>
                  <div className="nutrition-progress-row">
                    <ProgressRing value={caloriePercent} label="kcal" />
                    <div className="nutrition-number"><span>Calories</span><strong>{formatNumber(calories)} <small>/ {formatNumber(snapshot.caloriesTarget)}</small></strong><em>{formatNumber(caloriesRemaining)} remaining</em></div>
                  </div>
                  <div className="nutrition-progress-row protein-row">
                    <div className="protein-mark"><Heart size={16} /></div>
                    <div className="nutrition-number"><span>Protein</span><strong>{formatNumber(protein, 1)} <small>/ {formatNumber(snapshot.proteinTarget)} g</small></strong><em>{formatNumber(proteinRemaining, 1)} g remaining</em></div>
                    <div className="mini-progress"><span style={{ width: `${Math.min(100, proteinPercent)}%` }} /></div>
                  </div>
                  <button className="outline-action full-action" onClick={() => selectSection("diet")}><Plus size={16} /> Log a meal</button>
                </article>

                <article className="panel-card trend-card">
                  <div className="panel-heading"><div><p className="eyebrow">A GENTLE LOOK BACK</p><h2>Your week</h2></div><span className="chart-legend"><i /> Calories</span></div>
                  <div className="chart-wrap">
                    {snapshot.trend.length ? <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={snapshot.trend.slice(-7)} margin={{ top: 12, right: 6, left: -18, bottom: 0 }}>
                        <defs><linearGradient id="calorieArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8ca58f" stopOpacity={0.27} /><stop offset="100%" stopColor="#8ca58f" stopOpacity={0.01} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#ecece4" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#98998d", fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#98998d", fontSize: 10 }} />
                        <Tooltip formatter={(value) => [`${formatNumber(Number(value))} kcal`, "Calories"]} contentStyle={{ borderRadius: 12, borderColor: "#e9e9df", fontSize: 12 }} />
                        <Area type="monotone" dataKey="calories" connectNulls={false} stroke="#728c75" strokeWidth={2.5} fill="url(#calorieArea)" dot={{ fill: "#728c75", strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer> : <div className="chart-empty">Your nutrition trend will appear as you log meals.</div>}
                  </div>
                  <div className="chart-caption"><span>Recorded intake, last 7 days</span><button className="text-action" onClick={() => selectSection("diet")}>View diary <ArrowRight size={14} /></button></div>
                </article>

                <article className="journal-prompt-card">
                  <div className="journal-prompt-ornament"><NotebookPen size={19} /></div>
                  <p className="eyebrow">A MOMENT FOR YOU</p>
                  <h2>{snapshot.journal?.freeWrite || Object.values(snapshot.journal?.evening ?? {}).some(Boolean) ? "You made space to reflect." : "How are you feeling, really?"}</h2>
                  <p>{snapshot.journal?.freeWrite || Object.values(snapshot.journal?.evening ?? {}).some(Boolean) ? "Your thoughts are here whenever you need them." : "A few honest words can make sense of a busy day."}</p>
                  <button className="journal-button" onClick={() => selectSection("journal")}>{snapshot.journal ? "Revisit your journal" : "Open your journal"} <ArrowRight size={15} /></button>
                  <div className="journal-card-leaf"><Leaf size={82} strokeWidth={0.8} /></div>
                </article>
              </section>
            </>
          )}

          {section === "habits" && (
            <section className="module-page">
              <div className="module-title-row"><div><p className="eyebrow">SHOW UP FOR YOURSELF</p><h1>Your <em>habits.</em></h1><p className="welcome-subtitle">{todayLabel} · {completedHabits} of {scheduledHabits.length} scheduled practices complete</p></div><button className="primary-action" onClick={() => setHabitFormOpen((open) => !open)}><Plus size={17} /> New habit</button></div>
              {habitFormOpen && <form className="inline-form habit-create-form" onSubmit={addHabit}><label>Habit name<input required maxLength={100} value={habitName} onChange={(event) => setHabitName(event.target.value)} placeholder="e.g. Take a mindful walk" /></label><label>Category<select value={habitCategory} onChange={(event) => setHabitCategory(event.target.value)}>{["Health", "Fitness", "Learning", "Career", "Mindfulness", "Personal Growth", "Custom"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Points<input type="number" min="0" max="1000" value={habitPoints} onChange={(event) => setHabitPoints(event.target.value)} /></label><button className="primary-action" type="submit" disabled={saving || !snapshot.configured}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Create</button></form>}
              <div className="module-summary"><div className="summary-tile"><span>TODAY&apos;S COMPLETION</span><strong>{Math.round(habitPercent)}<small>%</small></strong></div><div className="summary-tile"><span>PRACTICES SCHEDULED</span><strong>{scheduledHabits.length.toString().padStart(2, "0")}</strong></div><div className="summary-tile"><span>POINTS AVAILABLE</span><strong>{formatNumber(snapshot.points)}<small> pts</small></strong></div></div>
              <article className="panel-card module-card"><div className="panel-heading"><div><p className="eyebrow">YOUR ROUTINE</p><h2>Daily practices</h2></div><span className="soft-tag">{todayLabel}</span></div>
                {snapshot.habits.length ? snapshot.habits.map((habit) => <div className={`habit-detail-row ${habit.status === "PAUSED" ? "paused-habit" : ""}`} key={habit.id}><button className={`habit-check large ${habit.completed ? "checked" : ""}`} disabled={busyId === habit.id || !snapshot.configured || habit.status === "PAUSED" || !habit.weekdays.includes(weekdayFromString(selectedDate))} onClick={() => void toggleHabit(habit)} aria-label={`${habit.completed ? "Undo" : "Complete"} ${habit.name}`}>{habit.completed ? <Check size={17} /> : <Circle size={18} />}</button><span className="habit-icon large-icon"><IconForHabit name={habit.icon} /></span><div className="habit-info"><strong>{habit.name}</strong><span>{habit.category} · {habit.status === "PAUSED" ? "Paused" : "Every day"}</span></div><span className="points-chip">+{habit.points} points</span><button className="text-action habit-manage-action" disabled={!snapshot.configured || saving} onClick={() => void updateHabitStatus(habit.id, habit.status === "PAUSED" ? "ACTIVE" : "PAUSED")}>{habit.status === "PAUSED" ? "Resume" : "Pause"}</button><button className="icon-button archive-action" disabled={!snapshot.configured || saving} aria-label={`Archive ${habit.name}`} onClick={() => void updateHabitStatus(habit.id, "ARCHIVED")}><Trash2 size={15} /></button></div>) : <div className="empty-state"><Sprout size={28} /><h3>No practice planned</h3><p>Add a habit when you&apos;re ready to begin.</p></div>}
              </article>
              <div className="gentle-note"><Leaf size={18} /><span>Consistency isn&apos;t perfection. Every return to your practice counts.</span></div>
            </section>
          )}

          {section === "calendar" && (
            <section className="module-page">
              <div className="module-title-row"><div><p className="eyebrow">NOTICE YOUR MOMENTUM</p><h1>Habit <em>calendar.</em></h1><p className="welcome-subtitle">A record of the days you showed up.</p></div><div className="month-switch"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ArrowLeft size={17} /></button><strong>{monthLabel(selectedDate)}</strong><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Next month"><ArrowRight size={17} /></button></div></div>
              <article className="panel-card calendar-panel"><div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">
                {calendarCells.map((item, index) => item ? <button key={item.date} className={`calendar-day heat-${item.scheduled ? Math.ceil(item.completed / item.scheduled * 4) : 0} ${item.date === selectedDate ? "selected" : ""} ${item.date > new Date().toLocaleDateString("en-CA") ? "future" : ""}`} onClick={() => setSelectedDate(item.date)} aria-label={`${friendlyDate(item.date)}: ${item.completed} of ${item.scheduled} habits complete`}><span>{Number(item.date.slice(-2))}</span>{item.date <= new Date().toLocaleDateString("en-CA") && item.scheduled > 0 && <i className={`day-dot ${item.completed === item.scheduled ? "all-done" : item.completed > 0 ? "some-done" : ""}`} aria-hidden="true" />}</button> : <span key={`blank-${index}`} />)}
              </div><div className="calendar-legend"><span><i className="legend-dot all-done" /> Practice complete</span><span><i className="legend-dot some-done" /> In progress</span><span><i className="legend-dot" /> Not complete</span></div></article>
              <article className="panel-card calendar-detail"><p className="eyebrow">{friendlyDate(selectedDate).toUpperCase()}</p><h2>{snapshot.calendar.find((item) => item.date === selectedDate)?.completed ?? completedHabits} <span>/</span> {snapshot.calendar.find((item) => item.date === selectedDate)?.scheduled ?? scheduledHabits.length} practices completed</h2><button className="text-action" onClick={() => selectSection("habits")}>View this day <ArrowRight size={14} /></button></article>
            </section>
          )}

          {section === "diet" && (
            <section className="module-page">
              <div className="module-title-row"><div><p className="eyebrow">NOURISH WITH INTENTION</p><h1>Food & <em>nutrition.</em></h1><p className="welcome-subtitle">{friendlyDate(selectedDate)} · Every entry is just information, never judgment.</p></div><div className="food-flower"><Apple size={25} /></div></div>
              <div className="nutrition-summary-grid">
                <article className="nutrition-summary-card"><div className="nutrition-summary-heading"><span>CALORIES</span><span className="nutrition-summary-icon peach"><Flame size={17} /></span></div><div className="macro-value">{formatNumber(calories)}<span> kcal</span></div><div className="macro-target">of {formatNumber(snapshot.caloriesTarget)} kcal target</div><div className="macro-bar"><i style={{ width: `${Math.min(100, caloriePercent)}%` }} /></div><div className="macro-foot"><span>{formatNumber(Math.min(snapshot.caloriesTarget, calories))} logged</span><span>{formatNumber(caloriesRemaining)} remaining</span></div></article>
                <article className="nutrition-summary-card"><div className="nutrition-summary-heading"><span>PROTEIN</span><span className="nutrition-summary-icon sage"><Heart size={17} /></span></div><div className="macro-value">{formatNumber(protein, 1)}<span> g</span></div><div className="macro-target">of {formatNumber(snapshot.proteinTarget)} g target</div><div className="macro-bar protein-bar"><i style={{ width: `${Math.min(100, proteinPercent)}%` }} /></div><div className="macro-foot"><span>{formatNumber(Math.min(snapshot.proteinTarget, protein), 1)} g logged</span><span>{formatNumber(proteinRemaining, 1)} g remaining</span></div></article>
              </div>
              <article className="panel-card target-edit"><div><p className="eyebrow">YOUR PERSONAL TARGETS</p><h2>Daily nutrition goals</h2><span>Illustrative starting values, not medical advice.</span></div><form onSubmit={saveTargets}><label>Calories <div className="target-input"><input type="number" min="0" max="10000" value={targetCalories} onChange={(event) => setTargetCalories(event.target.value)} /><span>kcal</span></div></label><label>Protein <div className="target-input"><input type="number" min="0" max="1000" step="0.1" value={targetProtein} onChange={(event) => setTargetProtein(event.target.value)} /><span>g</span></div></label><button className="save-targets" type="submit" disabled={saving || !snapshot.configured}>{saving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Save</button></form></article>
              <div className="diet-columns">
                <article className="panel-card food-entry-card"><div className="panel-heading"><div><p className="eyebrow">A LITTLE MORE AWARENESS</p><h2>Log food</h2></div><div className="log-icon"><Plus size={18} /></div></div>
                  <form className="food-form" onSubmit={addFood}>
                    <label>Find a food or add your own<div className="search-box"><Search size={16} /><input placeholder="Search eggs, oats, paneer…" value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} /></div></label>
                    {foodSearch && <div className="food-suggestions">{filteredFoods.slice(0, 5).map((food) => <button type="button" key={food.id} className="food-suggestion" onClick={() => chooseFood(food)}><span className="food-suggest-icon"><Apple size={15} /></span><span><strong>{food.name}</strong><small>{food.category} · {food.isCustom ? "your food" : "estimated"} · {food.calories} kcal per {food.basis === "100g" ? "100 g" : food.servingUnit}</small></span><ArrowRight size={14} /></button>)}{filteredFoods.length === 0 && <span className="no-food-results">No match — enter a custom food below.</span>}</div>}
                    <label>Food name<input required maxLength={120} value={foodName} onChange={(event) => { setFoodName(event.target.value); setSelectedFoodId(""); }} placeholder="e.g. Homemade lentil soup" /></label>
                    <div className="form-two"><label>Meal<select value={foodMeal} onChange={(event) => setFoodMeal(event.target.value)}>{meals.map((meal) => <option key={meal}>{meal}</option>)}</select></label><label>Nutrition basis<select value={foodBasis} onChange={(event) => { const basis = event.target.value as "100g" | "serving"; setFoodBasis(basis); setFoodUnit(basis === "100g" ? "g" : "serving"); }}><option value="100g">Per 100 g</option><option value="serving">Per serving</option></select></label></div>
                    <div className="form-two"><label>Amount consumed<div className="quantity-input"><input type="number" min="0.01" step="any" value={foodQuantity} onChange={(event) => setFoodQuantity(event.target.value)} />{foodBasis === "100g" ? <span>g</span> : <select aria-label="Serving unit" value={foodUnit} onChange={(event) => setFoodUnit(event.target.value)}>{["serving", "piece", "slice", "cup", "bowl", "glass", "scoop"].map((unit) => <option key={unit}>{unit}</option>)}</select>}</div></label><label>Calories {foodBasis === "100g" ? "/ 100 g" : `/ ${foodUnit}`}<input type="number" min="0" step="any" value={foodCalories} onChange={(event) => setFoodCalories(event.target.value)} placeholder="e.g. 180" /></label></div>
                    <div className="form-two"><label>Protein {foodBasis === "100g" ? "/ 100 g" : "/ serving"}<div className="quantity-input"><input type="number" min="0" step="any" value={foodProtein} onChange={(event) => setFoodProtein(event.target.value)} placeholder="e.g. 12" /><span>g</span></div></label><label>Notes <input value={foodNotes} onChange={(event) => setFoodNotes(event.target.value)} maxLength={500} placeholder="Optional" /></label></div>
                    {!selectedFoodId && <label className="save-food-choice"><input type="checkbox" checked={saveCustomFood} onChange={(event) => setSaveCustomFood(event.target.checked)} /> Save this custom food for next time</label>}
                    <div className="calculation-preview"><Sparkles size={15} /><span>Estimated for this entry</span><strong>{formatNumber(entryPreview.calories)} kcal</strong><strong>{formatNumber(entryPreview.protein, 1)} g protein</strong></div>
                    <button className="primary-action food-submit" type="submit" disabled={saving || !snapshot.configured}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Add to food diary</button>
                  </form>
                </article>
                <article className="panel-card diary-card"><div className="panel-heading"><div><p className="eyebrow">WHAT YOU&apos;VE HAD</p><h2>Food diary</h2></div><span className="soft-tag">{snapshot.foodLogs.length} {snapshot.foodLogs.length === 1 ? "entry" : "entries"}</span></div>
                  {snapshot.foodLogs.length === 0 ? <div className="empty-state diet-empty"><Apple size={27} /><h3>A fresh page</h3><p>Your logged meals will appear here, grouped by meal.</p></div> : <div className="meal-groups">{meals.map((meal) => {
                    const entries = snapshot.foodLogs.filter((entry) => entry.meal === meal);
                    if (!entries.length) return null;
                    return <section className="meal-group" key={meal}><div className="meal-heading"><h3>{meal}</h3><span>{formatNumber(entries.reduce((sum, entry) => sum + entry.calories, 0))} kcal · {formatNumber(entries.reduce((sum, entry) => sum + entry.protein, 0), 1)} g protein</span></div>{entries.map((entry) => editingLogId === entry.id ? <form className="food-edit-row" key={entry.id} onSubmit={saveFoodEdit}><label>Quantity ({entry.unit})<input type="number" min="0.01" step="any" value={editingQuantity} onChange={(event) => setEditingQuantity(event.target.value)} /></label><label>Meal<select value={editingMeal} onChange={(event) => setEditingMeal(event.target.value)}>{meals.map((item) => <option key={item}>{item}</option>)}</select></label><button type="submit" className="icon-button edit-action" aria-label="Save food changes" disabled={saving}><Check size={16} /></button><button type="button" className="icon-button delete-entry" aria-label="Cancel editing" onClick={() => setEditingLogId("")}><X size={16} /></button></form> : <div className="food-log-row" key={entry.id}><div className="food-bullet"><Apple size={15} /></div><div className="food-log-name"><strong>{entry.foodName}</strong><span>{formatNumber(entry.quantity, 1)} {entry.unit}{entry.notes ? ` · ${entry.notes}` : ""}</span></div><div className="food-log-nutrition"><strong>{formatNumber(entry.calories)} kcal</strong><span>{formatNumber(entry.protein, 1)} g protein</span></div><button className="icon-button delete-entry" disabled={saving} aria-label={`Edit ${entry.foodName}`} onClick={() => startEditingFood(entry)}><Pencil size={14} /></button><button className="icon-button delete-entry" disabled={saving} aria-label={`Log ${entry.foodName} again`} onClick={() => void duplicateFood(entry.id)}><Copy size={14} /></button><button className="icon-button delete-entry" disabled={busyId === entry.id} aria-label={`Delete ${entry.foodName}`} onClick={() => void deleteFood(entry.id)}>{busyId === entry.id ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}</button></div>)}</section>;
                  })}</div>}
                  <div className="diary-total"><span>Daily total</span><div><strong>{formatNumber(calories)} <small>kcal</small></strong><strong>{formatNumber(protein, 1)} <small>g protein</small></strong></div></div>
                </article>
              </div>
              <article className="panel-card nutrition-history"><div className="panel-heading"><div><p className="eyebrow">NO GOOD OR BAD DAYS</p><h2>Recent intake</h2></div><span className="chart-legend"><i /> Calories</span></div><div className="history-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={snapshot.trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}><defs><linearGradient id="historyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8ca58f" stopOpacity={0.22} /><stop offset="100%" stopColor="#8ca58f" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#ecece4" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#98998d", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#98998d", fontSize: 10 }} /><Tooltip formatter={(value) => [`${formatNumber(Number(value))} kcal`, "Calories"]} contentStyle={{ borderRadius: 12, borderColor: "#e9e9df", fontSize: 12 }} /><Area type="monotone" dataKey="calories" connectNulls={false} stroke="#728c75" strokeWidth={2.5} fill="url(#historyArea)" dot={{ fill: "#728c75", strokeWidth: 0, r: 3 }} /></AreaChart></ResponsiveContainer></div><p className="history-caption"><ArrowDown size={14} /> Days without logged food are left blank — no intake is assumed.</p></article>
            </section>
          )}

          {section === "journal" && (
            <section className="module-page journal-page">
              <div className="module-title-row"><div><p className="eyebrow">PAUSE · NOTICE · BEGIN AGAIN</p><h1>Daily <em>journal.</em></h1><p className="welcome-subtitle">{friendlyDate(selectedDate)} · Just for you.</p></div><div className="journal-sun"><Sparkles size={23} /></div></div>
              <div className="journal-intro"><div className="journal-quote-mark">“</div><p>You don&apos;t have to have it all figured out. Start where you are.</p><span>A GENTLE REMINDER</span></div>
              <form onSubmit={saveJournal}>
                <div className="journal-columns">
                  <article className="panel-card journal-section"><div className="journal-section-head"><span className="journal-period">01</span><div><p className="eyebrow">SET YOUR INTENTION</p><h2>A good morning</h2></div><span className="morning-sun">☼</span></div>{morningPrompts.map(([key, prompt]) => <label className="journal-prompt" key={key}>{prompt}<textarea rows={2} maxLength={2000} value={morning[key] ?? ""} onChange={(event) => setMorning((previous) => ({ ...previous, [key]: event.target.value }))} placeholder="Give yourself a moment to think…" /></label>)}</article>
                  <article className="panel-card journal-section evening-section"><div className="journal-section-head"><span className="journal-period evening-number">02</span><div><p className="eyebrow">REFLECT WITH KINDNESS</p><h2>A soft landing</h2></div><span className="evening-moon">☾</span></div>{eveningPrompts.map(([key, prompt]) => <label className="journal-prompt" key={key}>{prompt}<textarea rows={2} maxLength={2000} value={evening[key] ?? ""} onChange={(event) => setEvening((previous) => ({ ...previous, [key]: event.target.value }))} placeholder="Whatever comes to mind is enough…" /></label>)}</article>
                </div>
                <article className="panel-card journal-freewrite"><div className="panel-heading"><div><p className="eyebrow">YOUR OWN WORDS</p><h2>Free writing</h2></div><NotebookPen size={19} className="muted-icon" /></div><textarea rows={6} maxLength={10000} value={freeWrite} onChange={(event) => setFreeWrite(event.target.value)} placeholder="Let your thoughts find their way onto the page…" /><div className="journal-meta-row"><span>{freeWrite.length} / 10,000 characters</span><span className="soft-tag">{snapshot.journal ? "Entry saved" : "Not saved yet"}</span></div></article>
                <div className="reflection-row"><article className="panel-card feeling-card"><p className="eyebrow">HOW ARE YOU FEELING?</p><h2>Name what&apos;s here.</h2><div className="mood-options">{["Calm", "Good", "Okay", "Tired", "Stretched"].map((item) => <button key={item} type="button" className={`mood-option ${mood === item ? "selected" : ""}`} onClick={() => setMood(item)}>{item === "Calm" ? "☁" : item === "Good" ? "☀" : item === "Okay" ? "◡" : item === "Tired" ? "☾" : "〰"}<span>{item}</span></button>)}</div><div className="energy-row"><span>Energy today</span><div className="energy-options">{[1, 2, 3, 4, 5].map((level) => <button type="button" aria-label={`${level} out of 5 energy`} className={energy === level ? "selected" : ""} onClick={() => setEnergy(level)} key={level}>{level}</button>)}</div></div></article><article className="panel-card day-recap"><div className="recap-icon"><Target size={20} /></div><p className="eyebrow">TODAY&apos;S PRACTICE</p><h2>A day worth noticing.</h2><div className="recap-stat"><CheckCheck size={16} /><span>{completedHabits} of {scheduledHabits.length} habits completed</span></div><button type="button" className="text-action" onClick={() => selectSection("habits")}>See today&apos;s habits <ArrowRight size={14} /></button></article></div>
                <div className="journal-submit-row"><span>Your writing is saved privately in your journal.</span><button className="primary-action" type="submit" disabled={saving || !snapshot.configured}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save reflection</button></div>
              </form>
            </section>
          )}

          {section === "rewards" && (
            <section className="module-page">
              <div className="module-title-row"><div><p className="eyebrow">CELEBRATE YOUR CONSISTENCY</p><h1>Little <em>rewards.</em></h1><p className="welcome-subtitle">A thoughtful way to celebrate the effort you put in.</p></div><div className="reward-balance"><Sparkles size={18} /><span><strong>{formatNumber(snapshot.points)}</strong> points available</span></div></div>
              <div className="rewards-note"><Heart size={17} /><span>Rewards are a celebration, not a measure of your worth. Rest and care are always yours to take.</span></div>
              <article className="panel-card milestone-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">MILESTONES</p><h2>Your practice, over time</h2></div>
                  <span className="chart-legend"><Flame size={14} /> Longest streak · {snapshot.streaks.longest} {snapshot.streaks.longest === 1 ? "day" : "days"}</span>
                </div>
                <div className="milestone-list">
                  {streakMilestones.map((milestone) => {
                    const unlocked = snapshot.streaks.longest >= milestone.days;
                    return <div key={milestone.days} className={`milestone-item ${unlocked ? "unlocked" : ""}`}><span className="milestone-icon"><Award size={18} /></span><span><strong>{milestone.label}</strong><small>{milestone.days} consecutive {milestone.days === 1 ? "day" : "days"}</small></span><span className="milestone-status">{unlocked ? "Earned" : "In progress"}</span></div>;
                  })}
                </div>
                {nextStreakMilestone && <div className="milestone-progress"><div><span>Next: {nextStreakMilestone.label}</span><span>{Math.min(snapshot.streaks.current, nextStreakMilestone.days)} / {nextStreakMilestone.days} days</span></div><div className="thin-progress"><span style={{ width: `${Math.min(100, snapshot.streaks.current / nextStreakMilestone.days * 100)}%` }} /></div></div>}
              </article>
              <div className="rewards-grid">{snapshot.rewards.map((reward, index) => <article className="panel-card reward-card" key={reward.id}><div className={`reward-art reward-art-${index % 3}`}><IconForHabit name={reward.icon} /><Sparkles size={13} className="reward-spark" /></div><div className="reward-card-body"><span className="eyebrow">A LITTLE CELEBRATION</span><h2>{reward.name}</h2><p>{reward.description}</p><div className="reward-cost"><span><Sparkles size={15} /> {reward.cost} points</span><button className="redeem-button" disabled={!snapshot.configured || snapshot.points < reward.cost || saving} onClick={() => void redeemReward(reward.id)}>{saving ? <LoaderCircle size={15} className="spin" /> : "Redeem"}</button></div></div></article>)}</div>
              {snapshot.rewards.length === 0 && <div className="panel-card empty-state"><Gift size={27} /><h3>Your reward shelf is waiting</h3><p>Keep practicing to collect points for a celebration.</p></div>}
              <div className="rewards-footer"><Trophy size={17} /><span>Each habit completion earns points once. Undoing a completion also reverses its points.</span></div>
            </section>
          )}

          {section === "analytics" && (
            <section className="module-page">
              <div className="module-title-row">
                <div><p className="eyebrow">PROGRESS, WITH PERSPECTIVE</p><h1>Your <em>patterns.</em></h1><p className="welcome-subtitle">A clear-eyed look at your last {analyticsRange} days ending {friendlyDate(selectedDate)}.</p></div>
                <div className="analytics-controls">
                  <div className="range-selector" role="group" aria-label="Analytics date range">
                    {[7, 30, 90].map((days) => <button key={days} type="button" className={analyticsRange === days ? "selected" : ""} aria-pressed={analyticsRange === days} onClick={() => setAnalyticsRange(days)}>{days} days</button>)}
                  </div>
                  <div className="journal-sun"><Activity size={22} /></div>
                </div>
              </div>
              <div className="module-summary analytics-summary"><div className="summary-tile"><span>HABIT CONSISTENCY</span><strong>{snapshot.weeklyConsistency === null ? "—" : snapshot.weeklyConsistency}<small>{snapshot.weeklyConsistency === null ? "" : "%"}</small></strong></div><div className="summary-tile"><span>HABITS COMPLETED THIS WEEK</span><strong>{snapshot.weeklyCompleted}<small> / {snapshot.weeklyScheduled}</small></strong></div><div className="summary-tile"><span>DAYS WITH FOOD LOGS</span><strong>{recordedDays.length}<small> / {analyticsRange}</small></strong></div><div className="summary-tile"><span>AVERAGE RECORDED CALORIES</span><strong>{averageCalories === null ? "—" : formatNumber(averageCalories)}<small>{averageCalories === null ? "" : " kcal"}</small></strong></div></div>
              <div className="analytics-grid">
                <article className="panel-card analytics-chart-card"><div className="panel-heading"><div><p className="eyebrow">SHOWING UP</p><h2>Habit completion</h2></div><span className="chart-legend"><i /> Completed</span></div><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={snapshot.habitTrend} margin={{ top: 10, right: 5, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#ecece4" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#98998d", fontSize: 10 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#98998d", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e9e9df", fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="completed" name="Completed" fill="#819679" radius={[4, 4, 0, 0]} /><Bar dataKey="scheduled" name="Scheduled" fill="#e6e9df" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
                <article className="panel-card analytics-chart-card">
                  <div className="panel-heading"><div><p className="eyebrow">NOURISHMENT, WITHOUT JUDGMENT</p><h2>Recorded intake</h2></div><div className="chart-key"><span><i /> Calories</span><span><i className="protein-key" /> Protein</span></div></div>
                  <div className="analytics-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={snapshot.trend} margin={{ top: 10, right: 5, left: -16, bottom: 0 }}>
                        <defs><linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#315c4c" stopOpacity={0.2} /><stop offset="100%" stopColor="#315c4c" stopOpacity={0.01} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e5e9e2" />
                        <XAxis dataKey="date" tickFormatter={(value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })} minTickGap={24} tickLine={false} axisLine={false} tick={{ fill: "#737b73", fontSize: 10 }} />
                        <YAxis yAxisId="calories" tickLine={false} axisLine={false} tick={{ fill: "#737b73", fontSize: 10 }} />
                        <YAxis yAxisId="protein" orientation="right" hide domain={[0, "auto"]} />
                        <Tooltip labelFormatter={(value) => friendlyDate(String(value))} formatter={(value, name) => [`${formatNumber(Number(value), name === "Protein" ? 1 : 0)} ${name === "Protein" ? "g" : "kcal"}`, name]} contentStyle={{ borderRadius: 10, borderColor: "#e5e9e2", fontSize: 11 }} />
                        <Area yAxisId="calories" type="monotone" dataKey="calories" name="Calories" connectNulls={false} stroke="#315c4c" strokeWidth={2.4} fill="url(#analyticsArea)" dot={analyticsRange === 7 ? { fill: "#315c4c", strokeWidth: 0, r: 3 } : false} />
                        <Line yAxisId="protein" type="monotone" dataKey="protein" name="Protein" connectNulls={false} stroke="#8a73a8" strokeWidth={2} dot={analyticsRange === 7 ? { fill: "#8a73a8", strokeWidth: 0, r: 3 } : false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </div>
              <div className="analytics-bottom-grid">
                <article className="panel-card analytics-stat-card"><p className="eyebrow">HABIT RHYTHM</p><h2>Most consistent this week</h2>{rankedHabits.length ? rankedHabits.slice(0, 4).map((habit) => <div className="performance-row" key={habit.id}><span>{habit.name}</span><div className="performance-bar"><i style={{ width: `${habit.completed / habit.scheduled * 100}%` }} /></div><strong>{habit.completed}/{habit.scheduled}</strong></div>) : <p className="analytics-empty">Habit patterns will appear after you begin checking off scheduled habits.</p>}</article>
                <article className="panel-card analytics-stat-card"><p className="eyebrow">RECORDED NUTRITION</p><h2>Recent averages</h2><div className="average-macro"><span>Calories · logged days only</span><strong>{averageCalories === null ? "—" : `${formatNumber(averageCalories)} kcal`}</strong></div><div className="average-macro"><span>Protein · logged days only</span><strong>{averageProtein === null ? "—" : `${formatNumber(averageProtein, 1)} g`}</strong></div><div className="average-macro"><span>Days recorded</span><strong>{recordedDays.length} / {analyticsRange}</strong></div><p className="analytics-empty">Blank days are not interpreted as zero intake. Targets reflect your current settings.</p></article>
              </div>
            </section>
          )}

          {section === "review" && (
            <section className="module-page">
              <div className="module-title-row"><div><p className="eyebrow">A KIND LOOK BACK</p><h1>Weekly <em>review.</em></h1><p className="welcome-subtitle">A few minutes to notice what helped, and choose what comes next.</p></div><div className="journal-sun"><BookOpen size={21} /></div></div>
              <div className="review-stats"><div><span>HABIT CONSISTENCY</span><strong>{snapshot.weeklyConsistency === null ? "—" : `${snapshot.weeklyConsistency}%`}</strong></div><div><span>HABITS COMPLETED</span><strong>{snapshot.weeklyCompleted} / {snapshot.weeklyScheduled}</strong></div><div><span>MEALS RECORDED ON</span><strong>{weeklyRecordedDays.length} of 7 days</strong></div><div><span>AVERAGE LOGGED CALORIES</span><strong>{weeklyAverageCalories === null ? "—" : `${formatNumber(weeklyAverageCalories)} kcal`}</strong></div></div>
              <form className="panel-card weekly-review-form" onSubmit={saveWeeklyReview}><div className="review-prompts-grid">{reviewPrompts.map(([key, prompt]) => <label className="journal-prompt" key={key}>{prompt}<textarea rows={3} maxLength={2000} value={reviewAnswers[key] ?? ""} onChange={(event) => setReviewAnswers((previous) => ({ ...previous, [key]: event.target.value }))} placeholder="Take a moment to reflect…" /></label>)}</div><div className="journal-submit-row"><span>{snapshot.weeklyReview ? "Your reflection is saved and ready to revisit." : "A few honest notes are enough."}</span><button className="primary-action" type="submit" disabled={saving || !snapshot.configured}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save weekly review</button></div></form>
            </section>
          )}

          <footer className="app-footer"><span><Sprout size={14} /> The Daily Practice</span><span>Made for the person you&apos;re becoming.</span></footer>
        </div>
      </main>
    </div>
  );
}
