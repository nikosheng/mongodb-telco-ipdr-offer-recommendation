import React, { useState, useEffect } from 'react';
import { getPushLogSummary } from '../services/api';

const OfferDashboard = () => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await getPushLogSummary(selectedDate);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching offer summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  useEffect(() => {
    // Auto-refresh only if today is selected
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    let interval;
    if (isToday) {
      interval = setInterval(fetchSummary, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate]);

  // Generate options for last 3 days
  const dateOptions = [0, 1, 2].map(daysAgo => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : d.toLocaleDateString();
    return { value: dateStr, label };
  });

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-4 left-4 z-[1000] bg-white p-2 rounded shadow-lg hover:bg-gray-50 text-xs font-bold text-gray-700"
      >
        Show Dashboard
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] w-80 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-gray-200">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 text-sm">Offer Performance</h3>
        <div className="flex items-center space-x-2">
            <select 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-[10px] bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
                {dateOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <button 
                onClick={fetchSummary} 
                className="text-gray-500 hover:text-blue-600 transition-colors"
                title="Refresh"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
            <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {loading && summary.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
        ) : summary.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No offers pushed on this day.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {summary.map((item, idx) => (
              <div key={idx} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-700 text-sm truncate w-3/4" title={item.offerName}>{item.offerName || 'Unknown Offer'}</span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {item.totalPushed}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">Click Rate</span>
                    <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${item.clickRate}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{item.clickRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">Conversion</span>
                    <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${item.purchaseRate}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{item.purchaseRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-[10px] text-gray-400 text-center">
        Real-time Updates
      </div>
    </div>
  );
};

export default OfferDashboard;
