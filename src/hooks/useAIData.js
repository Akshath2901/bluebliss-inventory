// apps/inventory/src/hooks/useAIData.js
// One hook — wires Firebase data + AI engine for any component
import { useState, useEffect, useMemo } from 'react';
import { subscribeIngredients, subscribeUsageLogs, subscribeWasteLogs, subscribeSuppliers } from '../lib/firebase.js';
import { processAIData, calcDailyUsage, daysUntilStockout, getUrgency } from '../lib/aiEngine.js';

export function useAIData() {
  const [ingredients, setIngredients] = useState([]);
  const [usageLogs,   setUsageLogs]   = useState([]);
  const [wasteLogs,   setWasteLogs]   = useState([]);
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    let count = 0;
    const done = () => { count++; if (count >= 2) setLoading(false); };

    const u1 = subscribeIngredients(data => { setIngredients(data); done(); });
    const u2 = subscribeUsageLogs(data   => { setUsageLogs(data);   done(); });
    const u3 = subscribeWasteLogs(data   => setWasteLogs(data));
    const u4 = subscribeSuppliers(data   => setSuppliers(data));

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const aiData = useMemo(() =>
    processAIData(ingredients, usageLogs, wasteLogs, suppliers),
    [ingredients, usageLogs, wasteLogs, suppliers]
  );

  // Per-ingredient prediction helper
  const getPrediction = (ingredientId, currentStock) => {
    const daily = calcDailyUsage(usageLogs, ingredientId, 14);
    const days  = daysUntilStockout(currentStock, daily);
    return { dailyUsage: daily, daysLeft: days === Infinity ? null : days, urgency: getUrgency(days) };
  };

  return { ...aiData, ingredients, usageLogs, wasteLogs, suppliers, loading, getPrediction };
}

// Lightweight hook — just predictions, no waste/supplier data
export function useStockPredictions() {
  const [ingredients, setIngredients] = useState([]);
  const [usageLogs,   setUsageLogs]   = useState([]);

  useEffect(() => {
    const u1 = subscribeIngredients(setIngredients);
    const u2 = subscribeUsageLogs(setUsageLogs);
    return () => { u1(); u2(); };
  }, []);

  return useMemo(() =>
    ingredients.map(ing => {
      const daily = calcDailyUsage(usageLogs, ing.id, 14);
      const days  = daysUntilStockout(ing.currentStock, daily);
      return { ...ing, dailyUsage: daily, daysLeft: days === Infinity ? null : days, urgency: getUrgency(days) };
    }),
    [ingredients, usageLogs]
  );
}