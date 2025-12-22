// Forecast Service - Provides mock forecast data for dashboard
// In production, this would fetch from an API endpoint

/**
 * Generate mock asset status forecast data
 * Shows historical + forecasted counts for Available, Checked-Out, Under Repair
 */
export const getAssetStatusForecast = () => {
  return {
    chartData: [
      { month: 'Jan', available: 120, checkedOut: 45, underRepair: 15, forecastAvailable: 120, forecastCheckedOut: 45, forecastUnderRepair: 15 },
      { month: 'Feb', available: 125, checkedOut: 42, underRepair: 18, forecastAvailable: 125, forecastCheckedOut: 42, forecastUnderRepair: 18 },
      { month: 'Mar', available: 130, checkedOut: 40, underRepair: 20, forecastAvailable: 130, forecastCheckedOut: 40, forecastUnderRepair: 20 },
      { month: 'Apr', available: 128, checkedOut: 43, underRepair: 19, forecastAvailable: 128, forecastCheckedOut: 43, forecastUnderRepair: 19 },
      { month: 'May', available: 135, checkedOut: 38, underRepair: 17, forecastAvailable: 135, forecastCheckedOut: 38, forecastUnderRepair: 17 },
      { month: 'Jun', available: 140, checkedOut: 35, underRepair: 15, forecastAvailable: 140, forecastCheckedOut: 35, forecastUnderRepair: 15 },
      // Forecast data (next 3 months) - continues from Jun values
      { month: 'Jul', available: null, checkedOut: null, underRepair: null, forecastAvailable: 145, forecastCheckedOut: 32, forecastUnderRepair: 13 },
      { month: 'Aug', available: null, checkedOut: null, underRepair: null, forecastAvailable: 150, forecastCheckedOut: 30, forecastUnderRepair: 12 },
      { month: 'Sep', available: null, checkedOut: null, underRepair: null, forecastAvailable: 155, forecastCheckedOut: 28, forecastUnderRepair: 10 },
    ],
    tableData: [
      { status: 'Available', currentCount: 140, forecastCount: 155, trend: 'up' },
      { status: 'Checked-Out', currentCount: 35, forecastCount: 28, trend: 'down' },
      { status: 'Under Repair', currentCount: 15, forecastCount: 10, trend: 'down' },
    ]
  };
};

/**
 * Generate mock product demand forecast data
 * Shows historical + forecasted demand per asset model
 */
export const getProductDemandForecast = () => {
  return {
    chartData: [
      { month: 'Jan', 'MacBook Pro': 25, 'Dell XPS': 18, 'HP Pavilion': 12, 'Lenovo ThinkPad': 15, 'forecastMacBook': 25, 'forecastDell': 18, 'forecastHP': 12, 'forecastLenovo': 15 },
      { month: 'Feb', 'MacBook Pro': 28, 'Dell XPS': 20, 'HP Pavilion': 14, 'Lenovo ThinkPad': 16, 'forecastMacBook': 28, 'forecastDell': 20, 'forecastHP': 14, 'forecastLenovo': 16 },
      { month: 'Mar', 'MacBook Pro': 30, 'Dell XPS': 22, 'HP Pavilion': 16, 'Lenovo ThinkPad': 18, 'forecastMacBook': 30, 'forecastDell': 22, 'forecastHP': 16, 'forecastLenovo': 18 },
      { month: 'Apr', 'MacBook Pro': 32, 'Dell XPS': 24, 'HP Pavilion': 18, 'Lenovo ThinkPad': 20, 'forecastMacBook': 32, 'forecastDell': 24, 'forecastHP': 18, 'forecastLenovo': 20 },
      { month: 'May', 'MacBook Pro': 35, 'Dell XPS': 26, 'HP Pavilion': 20, 'Lenovo ThinkPad': 22, 'forecastMacBook': 35, 'forecastDell': 26, 'forecastHP': 20, 'forecastLenovo': 22 },
      { month: 'Jun', 'MacBook Pro': 38, 'Dell XPS': 28, 'HP Pavilion': 22, 'Lenovo ThinkPad': 24, 'forecastMacBook': 38, 'forecastDell': 28, 'forecastHP': 22, 'forecastLenovo': 24 },
      // Forecast data (next 3 months) - continues from Jun values
      { month: 'Jul', 'MacBook Pro': null, 'Dell XPS': null, 'HP Pavilion': null, 'Lenovo ThinkPad': null, 'forecastMacBook': 40, 'forecastDell': 30, 'forecastHP': 24, 'forecastLenovo': 26 },
      { month: 'Aug', 'MacBook Pro': null, 'Dell XPS': null, 'HP Pavilion': null, 'Lenovo ThinkPad': null, 'forecastMacBook': 42, 'forecastDell': 32, 'forecastHP': 26, 'forecastLenovo': 28 },
      { month: 'Sep', 'MacBook Pro': null, 'Dell XPS': null, 'HP Pavilion': null, 'Lenovo ThinkPad': null, 'forecastMacBook': 45, 'forecastDell': 35, 'forecastHP': 28, 'forecastLenovo': 30 },
    ],
    tableData: [
      { productName: 'MacBook Pro', currentDemand: 38, forecastDemand: 45, trend: 'up' },
      { productName: 'Dell XPS', currentDemand: 28, forecastDemand: 35, trend: 'up' },
      { productName: 'HP Pavilion', currentDemand: 22, forecastDemand: 28, trend: 'up' },
      { productName: 'Lenovo ThinkPad', currentDemand: 24, forecastDemand: 30, trend: 'up' },
    ]
  };
};

/**
 * Generate mock KPI summary data
 */
export const getKPISummary = () => {
  return [
    { title: 'Forecasted Total Demand', value: '138', unit: 'units', change: '+12%' },
    { title: 'Most Requested Asset Model', value: 'MacBook Pro', unit: 'model', change: '+8%' },
    { title: 'Expected Shortage Risk', value: 'Low', unit: 'status', change: '-5%' },
    { title: 'Predicted Change in Asset Status Count', value: '+15', unit: 'assets', change: '+3%' },
  ];
};

export default {
  getAssetStatusForecast,
  getProductDemandForecast,
  getKPISummary,
};

