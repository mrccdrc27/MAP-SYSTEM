import { useState, useCallback } from "react";
import api from "./axios";

/**
 * API endpoint configuration for ML forecasting analytics
 */
const FORECAST_ENDPOINTS = {
  volume: 'analytics/forecast/volume/',
  resolutionTime: 'analytics/forecast/resolution-time/',
  categories: 'analytics/forecast/categories/',
  slaRisk: 'analytics/forecast/sla-risk/',
  workload: 'analytics/forecast/workload/',
  dashboard: 'analytics/forecast/dashboard/',
};

/**
 * Build query string from forecast parameters
 */
const buildForecastQueryString = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value);
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * ML Forecasting Analytics Hook
 * 
 * Provides access to machine learning-based prediction endpoints:
 * 
 * VOLUME FORECASTING:
 * - volumeForecast: Predict future ticket volumes (daily/weekly/monthly)
 *   Params: forecast_days, history_days, granularity ('daily'|'weekly'|'monthly')
 * 
 * RESOLUTION TIME PREDICTIONS:
 * - resolutionTimeForecast: Predict resolution times by category
 *   Params: days, by ('priority'|'category'|'department'|'workflow')
 * 
 * CATEGORY TRENDS:
 * - categoryForecast: Forecast ticket category distribution trends
 *   Params: forecast_weeks, history_weeks
 * 
 * SLA BREACH RISK:
 * - slaRiskForecast: ML-based SLA breach risk scoring for open tickets
 *   Params: threshold (0-100, default: 70)
 * 
 * WORKLOAD FORECASTING:
 * - workloadForecast: Predict workload by hour and day of week
 *   Params: forecast_days, history_days
 * 
 * COMPREHENSIVE DASHBOARD:
 * - comprehensiveForecast: All predictions combined in one view
 *   Params: days, forecast_days
 */
const useForecastingAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Forecast State
  const [volumeForecast, setVolumeForecast] = useState(null);
  const [resolutionTimeForecast, setResolutionTimeForecast] = useState(null);
  const [categoryForecast, setCategoryForecast] = useState(null);
  const [slaRiskForecast, setSlaRiskForecast] = useState(null);
  const [workloadForecast, setWorkloadForecast] = useState(null);
  const [comprehensiveForecast, setComprehensiveForecast] = useState(null);

  // ==================== GENERIC FETCH HELPER ====================
  
  const fetchEndpoint = useCallback(async (endpoint, params = {}) => {
    const queryString = buildForecastQueryString(params);
    const response = await api.get(`${endpoint}${queryString}`);
    return response.data;
  }, []);

  // ==================== VOLUME FORECASTING ====================

  /**
   * Fetch ticket volume forecast
   * @param {Object} params - Forecast parameters
   * @param {number} params.forecast_days - Number of days to forecast (default: 14)
   * @param {number} params.history_days - Historical data to use (default: 90)
   * @param {string} params.granularity - 'daily' | 'weekly' | 'monthly' (default: 'daily')
   */
  const fetchVolumeForecast = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(FORECAST_ENDPOINTS.volume, params);
      setVolumeForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch volume forecast');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== RESOLUTION TIME FORECASTING ====================

  /**
   * Fetch resolution time predictions
   * @param {Object} params - Forecast parameters
   * @param {number} params.days - Historical days to analyze (default: 90)
   * @param {string} params.by - Group by: 'priority' | 'category' | 'department' | 'workflow'
   */
  const fetchResolutionTimeForecast = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(FORECAST_ENDPOINTS.resolutionTime, params);
      setResolutionTimeForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch resolution time forecast');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== CATEGORY TREND FORECASTING ====================

  /**
   * Fetch category trend forecast
   * @param {Object} params - Forecast parameters
   * @param {number} params.forecast_weeks - Number of weeks to forecast (default: 4)
   * @param {number} params.history_weeks - Historical weeks to analyze (default: 12)
   */
  const fetchCategoryForecast = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(FORECAST_ENDPOINTS.categories, params);
      setCategoryForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch category forecast');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== SLA BREACH RISK FORECASTING ====================

  /**
   * Fetch SLA breach risk predictions
   * @param {Object} params - Forecast parameters
   * @param {number} params.threshold - Risk score threshold 0-100 (default: 70)
   */
  const fetchSlaRiskForecast = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(FORECAST_ENDPOINTS.slaRisk, params);
      setSlaRiskForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch SLA risk forecast');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== WORKLOAD FORECASTING ====================

  /**
   * Fetch workload forecast with hourly and daily patterns
   * @param {Object} params - Forecast parameters
   * @param {number} params.forecast_days - Days to forecast (default: 7)
   * @param {number} params.history_days - Historical days for analysis (default: 60)
   */
  const fetchWorkloadForecast = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(FORECAST_ENDPOINTS.workload, params);
      setWorkloadForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch workload forecast');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== COMPREHENSIVE DASHBOARD ====================

  /**
   * Fetch comprehensive forecasting dashboard with all predictions
   * @param {Object} params - Forecast parameters
   * @param {number} params.days - Historical days for analysis (default: 60)
   * @param {number} params.forecast_days - Days to forecast (default: 14)
   */
  const fetchComprehensiveForecast = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(FORECAST_ENDPOINTS.dashboard, params);
      setComprehensiveForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch comprehensive forecast');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== FETCH ALL FORECASTS ====================

  /**
   * Fetch all forecasting data at once
   * @param {Object} params - Common parameters for all forecasts
   */
  const fetchAllForecasts = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [volume, resolution, category, slaRisk, workload, comprehensive] = await Promise.all([
        fetchEndpoint(FORECAST_ENDPOINTS.volume, params),
        fetchEndpoint(FORECAST_ENDPOINTS.resolutionTime, params),
        fetchEndpoint(FORECAST_ENDPOINTS.categories, params),
        fetchEndpoint(FORECAST_ENDPOINTS.slaRisk, params),
        fetchEndpoint(FORECAST_ENDPOINTS.workload, params),
        fetchEndpoint(FORECAST_ENDPOINTS.dashboard, params),
      ]);
      
      setVolumeForecast(volume);
      setResolutionTimeForecast(resolution);
      setCategoryForecast(category);
      setSlaRiskForecast(slaRisk);
      setWorkloadForecast(workload);
      setComprehensiveForecast(comprehensive);
      
      return {
        volumeForecast: volume,
        resolutionTimeForecast: resolution,
        categoryForecast: category,
        slaRiskForecast: slaRisk,
        workloadForecast: workload,
        comprehensiveForecast: comprehensive,
      };
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch forecasting data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== RESET STATE ====================

  const resetForecasts = useCallback(() => {
    setVolumeForecast(null);
    setResolutionTimeForecast(null);
    setCategoryForecast(null);
    setSlaRiskForecast(null);
    setWorkloadForecast(null);
    setComprehensiveForecast(null);
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    volumeForecast,
    resolutionTimeForecast,
    categoryForecast,
    slaRiskForecast,
    workloadForecast,
    comprehensiveForecast,
    
    // Individual fetch functions
    fetchVolumeForecast,
    fetchResolutionTimeForecast,
    fetchCategoryForecast,
    fetchSlaRiskForecast,
    fetchWorkloadForecast,
    fetchComprehensiveForecast,
    
    // Batch fetch
    fetchAllForecasts,
    
    // Reset
    resetForecasts,
    
    // Endpoints (for direct access if needed)
    FORECAST_ENDPOINTS,
  };
};

export default useForecastingAnalytics;
