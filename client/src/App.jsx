import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import { getIpdrData, getRecommendations, getOffers } from './services/api';

function App() {
  const [ipdrData, setIpdrData] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // Now stores { msisdn, name, tags }
  const [searchMsisdn, setSearchMsisdn] = useState('');
  const [mapCenter, setMapCenter] = useState([22.3193, 114.1694]); // HK
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchIpdr = async (name = null) => {
    try {
      setLoading(true);
      // Clear current data to show loading/update state
      if (name) {
        setIpdrData([]);
      }
      
      const res = await getIpdrData(name);
      
      if (res.data.success) {
        if (res.data.data && res.data.data.length > 0) {
          setIpdrData(res.data.data);
        } else {
          setIpdrData([]);
        }
        
        if (res.data.user) {
          setSelectedUser(res.data.user);
          // Fetch recommendations for this user
          const recRes = await getRecommendations(res.data.user.msisdn);
          if (recRes.data.success) {
            setOffers(recRes.data.data);
          }
        } else {
          setSelectedUser(null);
          if (name) {
             fetchInitialOffers();
          }
        }

        if (res.data.data && res.data.data.length > 0) {
          const first = res.data.data[0];
          setMapCenter([first.location.coordinates.coordinates[1], first.location.coordinates.coordinates[0]]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch IPDR", err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchMsisdn.trim()) {
      fetchIpdr(searchMsisdn);
    } else {
      setSelectedUser(null);
      fetchIpdr();
      fetchInitialOffers();
    }
  };

  const fetchInitialOffers = async () => {
    try {
      const res = await getOffers();
      if (res.data.success) {
        setOffers(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch initial offers", err);
    }
  };

  const handleUserSelect = async (msisdn) => {
    // This is called when clicking "Get Recommendation" on markers
    // It's better to just search for that user to get full profile
    fetchIpdr(msisdn);
  };

  useEffect(() => {
    fetchIpdr();
    fetchInitialOffers();
  }, []);

  useEffect(() => {
    const newMarkers = ipdrData
      .filter(item => item?.location?.coordinates?.coordinates)
      .map((item, idx) => ({
        position: [item.location.coordinates.coordinates[1], item.location.coordinates.coordinates[0]],
        msisdn: item.msisdn,
        userName: item.userName,
        isLatest: idx === 0 && selectedUser,
        content: (
          <div className="p-1 min-w-[150px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 && selectedUser ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-100 text-blue-700'}`}>
                {item.userName ? item.userName.charAt(0) : (item.msisdn ? item.msisdn.slice(-2) : '?')}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">{idx === 0 && selectedUser ? 'Latest Position' : 'User Profile'}</p>
                <p className="text-sm font-black text-gray-900 leading-tight">{item.userName || (item.msisdn ? `+${item.msisdn}` : 'Unknown')}</p>
                {item.userName && item.msisdn && <p className="text-[9px] text-gray-400">+{item.msisdn}</p>}
              </div>
            </div>
            <div className="space-y-1 mb-2">
               <p className="text-[10px] text-gray-500 font-medium">Activity: <span className="text-gray-900">{item.serviceType}</span></p>
               <p className="text-[10px] text-gray-500 font-medium">Time: <span className="text-gray-900">{new Date(item.timestamp).toLocaleTimeString()}</span></p>
            </div>
            {!selectedUser && (
              <button 
                onClick={() => {
                    setSearchMsisdn(item.msisdn);
                    fetchIpdr(item.msisdn);
                }}
                className="w-full bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-sm"
              >
                Get Recommendation
              </button>
            )}
          </div>
        )
      }));
    setMarkers(newMarkers);
  }, [ipdrData, selectedUser]);

  return (
    <div className="flex h-screen w-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-96 flex flex-col bg-white shadow-xl z-10 border-r border-gray-200">
        <header className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">IPDR Analytics & Recommendation</h1>
          </div>
          <p className="text-blue-100 text-xs font-medium opacity-80">IPDR Analytics & Recommendation</p>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
          {/* Search Bar */}
          <div className="px-2">
            <form onSubmit={handleSearch} className="relative group">
              <input 
                type="text" 
                placeholder="Search MSISDN (e.g. 85290000002)" 
                value={searchMsisdn}
                onChange={(e) => setSearchMsisdn(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all group-hover:bg-gray-200/50"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                {loading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              {searchMsisdn && (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchMsisdn('');
                    setSelectedUser(null);
                    fetchIpdr();
                    fetchInitialOffers();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
                  </svg>
                </button>
              )}
            </form>
          </div>

          {/* User Insight Section */}
          {selectedUser && (
            <div className="px-2">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider">User Activity Insight</h2>
                </div>
                
                {selectedUser.latestActivitySummary ? (
                  <p className="text-s text-blue-800 leading-relaxed mb-4 italic">
                    "{selectedUser.latestActivitySummary}"
                  </p>
                ) : (
                  <p className="text-xs text-blue-400 leading-relaxed mb-4 italic">
                    No activity summary available yet.
                  </p>
                )}

                {selectedUser.tags && selectedUser.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white/60 text-[9px] font-bold text-blue-700 rounded-full border border-blue-200 uppercase tracking-tight">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 px-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {selectedUser ? `Offers for MSISDN ${selectedUser.msisdn}` : 'All Offers'}
              </h2>
              {selectedUser && (
                <button 
                  onClick={() => {
                    setSearchMsisdn('');
                    setSelectedUser(null);
                    fetchInitialOffers();
                    fetchIpdr();
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase"
                >
                  Clear
                </button>
              )}
            </div>
            <span className="text-[10px] text-gray-400">
              {selectedUser ? `Personalized for +${selectedUser.msisdn} (${selectedUser.name})` : 'Showing all available service packages'}
            </span>
          </div>
          
          <div className="space-y-4">
            {offers.length > 0 ? (
              offers.map((offer, idx) => (
                <div key={idx} className="group p-4 bg-gray-50 hover:bg-white rounded-2xl border border-transparent hover:border-blue-100 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                  {selectedUser && offer.score && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-green-500 text-white text-[8px] font-black rounded-bl-lg">
                      {Math.round(offer.score * 100)}% MATCH
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors pr-8">{offer.name}</h3>
                    <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                    {offer.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {offer.tags?.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-1 bg-white text-[10px] font-bold text-gray-500 rounded-md border border-gray-100 uppercase tracking-tighter">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">No offers found</p>
              </div>
            )}
          </div>

          {/* Analytics Overview */}
          <section className="pt-4 border-t border-gray-100 pb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">
              {selectedUser ? `Latest 10 Activities for +${selectedUser.msisdn}` : 'Recent Analytics'}
            </h2>
            <div className="space-y-3">
              {ipdrData.slice(0, selectedUser ? 10 : 5).map((log, i) => (
                <div key={i} className="group flex flex-col gap-2 p-3 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {log.userName ? log.userName.charAt(0) : (log.msisdn ? log.msisdn.slice(-2) : '??')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-black text-gray-900 truncate">
                          {log.userName || `+${log.msisdn}`}
                        </p>
                        <span className="text-[9px] font-bold text-gray-400 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-600 font-bold truncate uppercase tracking-tighter">{log.serviceType}</p>
                    </div>
                  </div>
                  
                  <div className="mt-1 pl-11 space-y-1.5">
                    {log.url && (
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <p className="text-[9px] text-gray-500 font-medium truncate break-all">{log.url}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[9px] text-gray-400 font-bold">{formatDuration(log.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        <span className="text-[9px] text-gray-400 font-bold">{formatBytes((log.downloadVolume || 0) + (log.uploadVolume || 0))}</span>
                      </div>
                    </div>

                    {log.location && (
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[9px] text-gray-400 font-medium">
                          {log.location.city}{log.location.district ? `, ${log.location.district}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* Main Map Content */}
      <main className="flex-1 relative bg-gray-200">
        <Map markers={markers} center={mapCenter} />
        
        {/* Map Overlays */}
        <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Active Nodes</span>
                <span className="text-2xl font-black text-gray-900">{ipdrData.length}</span>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Offers Ready</span>
                <span className="text-2xl font-black text-blue-600">5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-gray-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold tracking-widest uppercase">Live IPDR Monitoring System</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
