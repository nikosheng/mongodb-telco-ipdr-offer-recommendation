import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export const getIpdrData = async (userName) => {
  return axios.get(`${API_URL}/ipdr`, {
    params: { userName }
  });
};

export const getOffers = async () => {
  return axios.get(`${API_URL}/offers`);
};

export const getRecommendations = async (msisdn) => {
  return axios.get(`${API_URL}/offers/recommend`, {
    params: { userId: msisdn }
  });
};

export const getSimilarUsers = async (msisdn) => {
  return axios.get(`${API_URL}/users/similar`, {
    params: { userId: msisdn }
  });
};

export const createOffer = async (offerData) => {
  return axios.post(`${API_URL}/offers`, offerData);
};

// Offer Push Logs
export const logOfferPush = async (data) => {
  return axios.post(`${API_URL}/push-logs`, data);
};

export const updatePushStatus = async (id, status) => {
  return axios.put(`${API_URL}/push-logs/${id}`, { status });
};

export const getPushLogSummary = async (date) => {
  return axios.get(`${API_URL}/push-logs/summary`, {
    params: { date }
  });
};
