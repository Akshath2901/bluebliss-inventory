// apps/inventory/src/lib/aiEngine.js
// ═══════════════════════════════════════════════════════════
// BlueBliss AI Intelligence Engine
// Pure JavaScript — zero API calls, instant, always works
// Powers predictions, anomalies, scores, and recommendations
// ═══════════════════════════════════════════════════════════

/* ─── STOCK PREDICTIONS ───────────────────────────────────── */

// Calculate average daily usage from usage logs
export const calcDailyUsage = (usageLogs = [], ingredientId, days = 14) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const relevant = usageLogs.filter(log => {
    const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || 0);
    return log.ingredientId === ingredientId
      && ts >= since
      && (log.quantityChange < 0 || log.type === 'manual_deduction');
  });

  if (!relevant.length) return 0;
  const total = relevant.reduce((s, l) => s + Math.abs(l.quantityChange || 0), 0);
  return +(total / days).toFixed(2);
};

// Days until stockout
export const daysUntilStockout = (currentStock, dailyUsage) => {
  if (!dailyUsage || dailyUsage <= 0) return Infinity;
  return Math.max(0, Math.floor(currentStock / dailyUsage));
};

// Predict reorder date (accounting for supplier lead time)
export const reorderBy = (currentStock, dailyUsage, leadTimeDays = 1, safetyDays = 2) => {
  const daysLeft = daysUntilStockout(currentStock, dailyUsage);
  const reorderIn = daysLeft - leadTimeDays - safetyDays;
  if (reorderIn <= 0) return 'TODAY';
  if (reorderIn === 1) return 'Tomorrow';
  const date = new Date();
  date.setDate(date.getDate() + reorderIn);
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Recommended order quantity (2 weeks supply)
export const recommendedOrderQty = (dailyUsage, maxStock, currentStock, weeksSupply = 2) => {
  const target = dailyUsage * 7 * weeksSupply;
  return Math.max(0, Math.ceil(target - currentStock));
};

// Urgency level for reorder
export const getUrgency = (daysLeft) => {
  if (daysLeft <= 0)  return { level: 'out',      label: 'Out of Stock', color: '#DC2626' };
  if (daysLeft <= 2)  return { level: 'critical',  label: 'Critical',    color: '#DC2626' };
  if (daysLeft <= 5)  return { level: 'urgent',    label: 'Order Soon',  color: '#D97706' };
  if (daysLeft <= 10) return { level: 'watch',     label: 'Watch',       color: '#B45309' };
  return                       { level: 'ok',       label: 'Healthy',     color: '#16A34A' };
};

/* ─── ANOMALY DETECTION ───────────────────────────────────── */

// Z-score based anomaly detection
export const detectAnomaly = (values, newValue, threshold = 2.0) => {
  if (values.length < 5) return { isAnomaly: false };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std  = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  if (std === 0) return { isAnomaly: false };
  const zScore = Math.abs((newValue - mean) / std);
  return {
    isAnomaly:  zScore > threshold,
    zScore:     +zScore.toFixed(2),
    mean:       +mean.toFixed(2),
    std:        +std.toFixed(2),
    direction:  newValue > mean ? 'high' : 'low',
    pctChange:  mean > 0 ? +(((newValue - mean) / mean) * 100).toFixed(0) : 0,
  };
};

// Detect anomalies in recent usage logs
export const detectUsageAnomalies = (usageLogs = [], ingredients = []) => {
  const anomalies = [];

  ingredients.forEach(ingredient => {
    const logs = usageLogs
      .filter(l => l.ingredientId === ingredient.id && l.quantityChange < 0)
      .slice(0, 30);

    if (logs.length < 5) return;

    const recent   = logs[0];
    const baseline = logs.slice(1, 15).map(l => Math.abs(l.quantityChange || 0));
    const result   = detectAnomaly(baseline, Math.abs(recent?.quantityChange || 0));

    if (result.isAnomaly) {
      anomalies.push({
        ingredient:  ingredient.name,
        ingredientId:ingredient.id,
        actual:      Math.abs(recent?.quantityChange || 0),
        normal:      result.mean,
        zScore:      result.zScore,
        pctChange:   result.pctChange,
        direction:   result.direction,
        date:        recent?.timestamp?.toDate
          ? recent.timestamp.toDate().toLocaleDateString('en-IN')
          : 'Recently',
        severity:    result.zScore > 3 ? 'high' : 'medium',
      });
    }
  });

  return anomalies.sort((a, b) => b.zScore - a.zScore);
};

/* ─── WASTE INTELLIGENCE ──────────────────────────────────── */

// Identify waste patterns by day of week
export const wasteByDayOfWeek = (wasteLogs = []) => {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const totals = Object.fromEntries(days.map(d => [d, { cost: 0, count: 0 }]));

  wasteLogs.forEach(log => {
    const ts  = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || 0);
    const day = days[ts.getDay()];
    totals[day].cost  += log.cost || 0;
    totals[day].count += 1;
  });

  return days.map(day => ({ day, ...totals[day] }));
};

// Find worst waste offenders
export const topWasteIngredients = (wasteLogs = [], limit = 5) => {
  const map = {};
  wasteLogs.forEach(l => {
    if (!map[l.ingredientName]) map[l.ingredientName] = { name: l.ingredientName, cost: 0, qty: 0, count: 0 };
    map[l.ingredientName].cost  += l.cost || 0;
    map[l.ingredientName].qty   += l.quantity || 0;
    map[l.ingredientName].count += 1;
  });
  return Object.values(map).sort((a, b) => b.cost - a.cost).slice(0, limit);
};

// Calculate waste rate (waste / total used)
export const calcWasteRate = (usageLogs = [], wasteLogs = [], days = 30) => {
  const since = new Date(); since.setDate(since.getDate() - days);
  const totalUsed  = usageLogs.filter(l => {
    const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp || 0);
    return ts >= since;
  }).reduce((s, l) => s + Math.abs(l.quantityChange || 0), 0);

  const totalWasted = wasteLogs.filter(l => {
    const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp || 0);
    return ts >= since;
  }).reduce((s, l) => s + (l.quantity || 0), 0);

  return totalUsed > 0 ? +((totalWasted / totalUsed) * 100).toFixed(1) : 0;
};

/* ─── STOCK HEALTH SCORING ────────────────────────────────── */

// Overall kitchen health score (0-100)
export const calcKitchenHealthScore = (ingredients = [], usageLogs = []) => {
  if (!ingredients.length) return 100;

  let score = 100;
  let deductions = [];

  const critical = ingredients.filter(i => i.currentStock <= 0);
  const low      = ingredients.filter(i => i.currentStock > 0 && i.currentStock <= i.minThreshold);

  // Deduct for critical items
  const criticalDeduction = Math.min(40, critical.length * 12);
  if (criticalDeduction > 0) {
    score -= criticalDeduction;
    deductions.push(`${critical.length} item(s) out of stock`);
  }

  // Deduct for low items
  const lowDeduction = Math.min(20, low.length * 5);
  if (lowDeduction > 0) {
    score -= lowDeduction;
    deductions.push(`${low.length} item(s) running low`);
  }

  // Deduct for items predicted to run out within 3 days
  const atRisk = ingredients.filter(i => {
    const daily = calcDailyUsage(usageLogs, i.id, 7);
    if (!daily) return false;
    return daysUntilStockout(i.currentStock, daily) <= 3;
  });
  const riskDeduction = Math.min(20, atRisk.length * 7);
  if (riskDeduction > 0) {
    score -= riskDeduction;
    deductions.push(`${atRisk.length} item(s) at risk this week`);
  }

  return {
    score:       Math.max(0, score),
    grade:       score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
    status:      score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Needs Attention' : 'Critical',
    color:       score >= 90 ? '#16A34A' : score >= 75 ? '#B45309' : score >= 60 ? '#D97706' : '#DC2626',
    deductions,
  };
};

/* ─── PURCHASE ORDER INTELLIGENCE ────────────────────────────*/

// Generate smart reorder suggestions
export const generateReorderSuggestions = (ingredients = [], usageLogs = [], suppliers = []) => {
  return ingredients
    .map(ingredient => {
      const dailyUsage = calcDailyUsage(usageLogs, ingredient.id, 14);
      const days       = daysUntilStockout(ingredient.currentStock, dailyUsage);
      const urgency    = getUrgency(days);
      const supplier   = suppliers.find(s => s.ingredients?.includes(ingredient.name));
      const orderQty   = recommendedOrderQty(dailyUsage, ingredient.maxStock, ingredient.currentStock);
      const orderCost  = orderQty * (ingredient.costPerUnit || 0);
      const reorderDate= reorderBy(ingredient.currentStock, dailyUsage, supplier?.leadTimeDays || 1);

      return {
        ingredientId:   ingredient.id,
        ingredient:     ingredient.name,
        unit:           ingredient.unit,
        currentStock:   ingredient.currentStock,
        dailyUsage,
        daysLeft:       days === Infinity ? null : days,
        urgency,
        orderQty,
        orderCost,
        reorderDate,
        supplier:       supplier?.name || 'Unknown',
        supplierPhone:  supplier?.phone || '',
        leadTime:       supplier?.leadTimeDays || 1,
      };
    })
    .filter(item => item.urgency.level !== 'ok' || item.daysLeft !== null)
    .sort((a, b) => {
      const order = { out: 0, critical: 1, urgent: 2, watch: 3, ok: 4 };
      return (order[a.urgency.level] || 4) - (order[b.urgency.level] || 4);
    });
};

/* ─── COST & PROFIT INTELLIGENCE ─────────────────────────────*/

// Identify best and worst margin items
export const analyzeMenuProfitability = (menuItems) => {
  if (!menuItems?.length) return { best: null, worst: null, avgMargin: 0 };

  const withMargins = menuItems.map(item => {
    const cost   = (item.ingredients || []).reduce((s, i) => s + (i.qty * i.cost), 0);
    const margin = item.price > 0 ? ((item.price - cost) / item.price) * 100 : 0;
    return { ...item, cost: +cost.toFixed(2), margin: +margin.toFixed(1), profit: +(item.price - cost).toFixed(2) };
  });

  const sorted    = [...withMargins].sort((a, b) => b.margin - a.margin);
  const avgMargin = +(withMargins.reduce((s, i) => s + i.margin, 0) / withMargins.length).toFixed(1);

  return {
    best:       sorted[0],
    worst:      sorted[sorted.length - 1],
    avgMargin,
    allItems:   sorted,
    lowMargin:  sorted.filter(i => i.margin < 40),
    highMargin: sorted.filter(i => i.margin >= 65),
  };
};

/* ─── STAFF INTELLIGENCE ──────────────────────────────────── */

// Calculate staff performance score
export const calcStaffPerformance = (staffMember, attendance = {}) => {
  const attMonth  = attendance[staffMember.id]?.May || {};
  const days      = Object.values(attMonth);
  const present   = days.filter(d => d === 'P').length;
  const half      = days.filter(d => d === 'H').length;
  const total     = days.length || 1;
  const attRate   = +((present + half * 0.5) / total * 100).toFixed(0);

  let score = attRate;
  let badges = [];

  if (attRate >= 95) badges.push({ label: 'Perfect Attendance', color: '#16A34A' });
  if (attRate >= 90) badges.push({ label: 'Reliable', color: '#16A34A' });
  if (attRate < 75)  badges.push({ label: 'Attendance Issue', color: '#DC2626' });

  return {
    score,
    attRate,
    grade: score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 65 ? 'C' : 'D',
    badges,
    presentDays: present,
    halfDays:    half,
    absentDays:  days.filter(d => d === 'A').length,
  };
};

/* ─── TREND ANALYSIS ──────────────────────────────────────── */

// Linear regression — predict future value
export const linearTrend = (values) => {
  const n = values.length;
  if (n < 2) return { slope: 0, direction: 'stable', prediction: values[0] || 0 };

  const sumX  = values.reduce((s, _, i) => s + i, 0);
  const sumY  = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const prediction = +(intercept + slope * n).toFixed(2);

  return {
    slope:      +slope.toFixed(3),
    direction:  slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable',
    prediction,
    pctChange:  values[0] > 0 ? +((prediction - values[0]) / values[0] * 100).toFixed(0) : 0,
  };
};

// Usage trend over last N days
export const usageTrend = (usageLogs, ingredientId, days = 7) => {
  const dailyMap = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toDateString()] = 0;
  }

  usageLogs
    .filter(l => l.ingredientId === ingredientId && l.quantityChange < 0)
    .forEach(log => {
      const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || 0);
      const key = ts.toDateString();
      if (key in dailyMap) dailyMap[key] += Math.abs(log.quantityChange || 0);
    });

  return Object.entries(dailyMap).reverse().map(([date, qty]) => ({ date, qty }));
};

/* ─── SMART SUMMARY GENERATION ───────────────────────────────*/

// Generate text insights without any API
export const generateLocalInsights = (ingredients = [], usageLogs = [], wasteLogs = []) => {
  const insights = [];

  // Critical stock insight
  const critical = ingredients.filter(i => i.currentStock <= 0);
  if (critical.length) {
    insights.push({
      type: 'critical',
      icon: '🔴',
      title: `${critical.length} item${critical.length > 1 ? 's' : ''} out of stock`,
      body: `${critical.map(i => i.name).join(', ')} ${critical.length > 1 ? 'are' : 'is'} completely out. Immediate reorder required.`,
      action: 'Create Purchase Order',
      actionPath: '/purchase-orders',
    });
  }

  // Usage spike insight
  const anomalies = detectUsageAnomalies(usageLogs, ingredients);
  if (anomalies.length) {
    const top = anomalies[0];
    insights.push({
      type: 'anomaly',
      icon: '⚠️',
      title: `Unusual usage: ${top.ingredient}`,
      body: `${top.ingredient} usage was ${top.pctChange > 0 ? '+' : ''}${top.pctChange}% vs normal (${top.actual} vs avg ${top.normal} units). Verify with kitchen staff.`,
      action: 'View Usage',
      actionPath: '/usage',
    });
  }

  // Waste insight
  const topWaste = topWasteIngredients(wasteLogs, 1)[0];
  if (topWaste) {
    insights.push({
      type: 'waste',
      icon: '🗑️',
      title: `Highest waste: ${topWaste.name}`,
      body: `₹${topWaste.cost.toFixed(0)} lost from ${topWaste.name} this period across ${topWaste.count} incidents.`,
      action: 'View Waste Log',
      actionPath: '/waste',
    });
  }

  // Reorder insight
  const needsReorder = ingredients.filter(i => {
    const daily = calcDailyUsage(usageLogs, i.id, 7);
    if (!daily) return false;
    return daysUntilStockout(i.currentStock, daily) <= 3;
  });
  if (needsReorder.length) {
    insights.push({
      type: 'reorder',
      icon: '🛒',
      title: `${needsReorder.length} item${needsReorder.length > 1 ? 's' : ''} need reorder within 3 days`,
      body: `${needsReorder.slice(0, 3).map(i => i.name).join(', ')} will run out soon based on current usage patterns.`,
      action: 'Create PO',
      actionPath: '/purchase-orders',
    });
  }

  return insights;
};

/* ─── REACT HOOK ──────────────────────────────────────────── */

// All-in-one hook for AI data across the app
export const processAIData = (ingredients = [], usageLogs = [], wasteLogs = [], suppliers = [], attendance = {}) => {
  const healthScore      = calcKitchenHealthScore(ingredients, usageLogs);
  const reorderSuggestions = generateReorderSuggestions(ingredients, usageLogs, suppliers);
  const anomalies        = detectUsageAnomalies(usageLogs, ingredients);
  const wasteRate        = calcWasteRate(usageLogs, wasteLogs);
  const topWaste         = topWasteIngredients(wasteLogs);
  const insights         = generateLocalInsights(ingredients, usageLogs, wasteLogs);

  // Per-ingredient predictions
  const predictions = ingredients.map(ingredient => {
    const dailyUsage = calcDailyUsage(usageLogs, ingredient.id, 14);
    const days       = daysUntilStockout(ingredient.currentStock, dailyUsage);
    const urgency    = getUrgency(days);
    return {
      id:          ingredient.id,
      name:        ingredient.name,
      unit:        ingredient.unit,
      currentStock:ingredient.currentStock,
      dailyUsage,
      daysLeft:    days === Infinity ? null : days,
      urgency,
    };
  }).sort((a, b) => {
    if (a.daysLeft === null) return 1;
    if (b.daysLeft === null) return -1;
    return a.daysLeft - b.daysLeft;
  });

  return {
    healthScore,
    predictions,
    reorderSuggestions: reorderSuggestions.slice(0, 8),
    anomalies:          anomalies.slice(0, 5),
    wasteRate,
    topWaste,
    insights:           insights.slice(0, 4),
  };
};