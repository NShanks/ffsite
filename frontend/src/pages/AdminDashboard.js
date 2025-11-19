import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css'; // Import our admin styles
import './DashboardPage.css'; // Reuse the *league* tab styles
import './LeagueDetailPage.css'; // Reuse the table styles

// --- Secure Axios Instance ---
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// --- React Component Starts Here ---

function AdminDashboard() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('commands');
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [teams, setTeams] = useState([]); // This will now be used by 3 tabs
  
  // We no longer need the 'allMembers' state!
  
  const [venmoInputs, setVenmoInputs] = useState({});
  const [commandLoading, setCommandLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [dataLoading, setDataLoading] = useState(true);

  // --- Data Fetching Effects ---
  
  // Effect 1: Fetch all leagues (for the sub-tabs)
  useEffect(() => {
    setDataLoading(true);
    api.get('/leagues/')
      .then(response => {
        setLeagues(response.data);
        if (response.data.length > 0) {
          setSelectedLeagueId(response.data[0].id);
        }
        setDataLoading(false);
      })
      .catch(error => {
        console.error("Error fetching leagues:", error)
        setStatusMessage({ type: 'error', text: 'Could not load leagues.' });
        setDataLoading(false);
      });
  }, []);

  // Effect 2: Fetch data based on the *active main tab*
  useEffect(() => {
    setTeams([]); // Reset teams when tab changes
    setStatusMessage({ type: '', text: '' });
    
    // --- THIS IS CHANGE #1 ---
    // We've added 'dues' to this list.
    if ((activeTab === 'venmo' || activeTab === 'playoffs' || activeTab === 'dues') && selectedLeagueId) {
      setDataLoading(true);
      api.get(`/teams/?league=${selectedLeagueId}`)
        .then(response => {
          setTeams(response.data);
          
          if (activeTab === 'venmo') {
            const initialVenmos = {};
            response.data.forEach(team => {
              if (team.owner) {
                initialVenmos[team.owner.id] = team.owner.payment_info || '';
              }
            });
            setVenmoInputs(initialVenmos);
          }
          setDataLoading(false);
        })
        .catch(error => {
          console.error("Error fetching teams:", error)
          setStatusMessage({ type: 'error', text: 'Could not load teams for this league.' });
          setDataLoading(false);
        });
    }
    // --- THIS IS CHANGE #2 ---
    // We've REMOVED the old 'else if (activeTab === 'dues')' block
    // It's no longer needed.

  }, [activeTab, selectedLeagueId]);

  
  // --- Event Handlers (No changes to handlers) ---

  const handleRunCommand = (command) => {
    setCommandLoading(true);
    setStatusMessage({ type: '', text: '' });
    
    let url = '';
    let data = {};
    let week = null;
    
    switch(command) {
      case 'sync':
        url = '/admin/run-sync/';
        break;
      case 'start_playoff':
        url = '/admin/start-playoff/';
        break;
      case 'post_winners':
        week = prompt('Which week do you want to post winners for?');
        if (!week) { setCommandLoading(false); return; }
        url = '/admin/post-winners/';
        data = { week };
        break;
      case 'run_elimination':
        week = prompt('Which playoff week are you running elimination for? (e.g., 15)');
        if (!week) { setCommandLoading(false); return; }
        url = '/admin/run-elimination/';
        data = { week };
        break;
      default:
        setCommandLoading(false);
        return;
    }

    api.post(url, data)
      .then(response => {
        setStatusMessage({ type: 'success', text: response.data.message });
        setCommandLoading(false);
      })
      .catch(error => {
        const errorMsg = error.response?.data?.message || 'Command failed.';
        setStatusMessage({ type: 'error', text: `Error: ${errorMsg}` });
        setCommandLoading(false);
      });
  };

  const handleVenmoChange = (profileId, value) => {
    setVenmoInputs(prev => ({ ...prev, [profileId]: value }));
  };

  const handleVenmoSave = (profileId) => {
    const venmo_info = venmoInputs[profileId];
    api.post(`/member-profile/${profileId}/update-venmo/`, { venmo_info })
      .then(response => {
        setStatusMessage({ type: 'success', text: response.data.message });
        // We'll just refresh the data to be safe
        api.get(`/teams/?league=${selectedLeagueId}`).then(res => setTeams(res.data));
      })
      .catch(error => setStatusMessage({ type: 'error', text: 'Failed to save Venmo.' }));
  };

  const handleToggleDues = (profileId) => {
    api.post(`/member-profile/${profileId}/toggle-dues/`)
      .then(response => {
        // Update the state locally for a faster UI response
        setTeams(prevTeams => 
          prevTeams.map(team => 
            (team.owner && team.owner.id === profileId)
              ? { ...team, owner: { ...team.owner, has_paid_dues: response.data.has_paid_dues } }
              : team
          )
        );
      })
      .catch(error => setStatusMessage({ type: 'error', text: 'Failed to update dues.' }));
  };

  const handleTogglePlayoffFlag = (teamId) => {
    api.post(`/team/${teamId}/toggle-playoff-flag/`)
      .then(response => {
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team.id === teamId
              ? { ...team, made_league_playoffs: response.data.made_league_playoffs }
              : team
          )
        );
      })
      .catch(error => setStatusMessage({ type: 'error', text: 'Failed to update flag.' }));
  };
  
  // --- Render Functions for Tabs ---
  
  const renderCommandCenter = () => (
    // ... (This function is unchanged)
    <div className="command-grid">
      <button className="command-button" onClick={() => handleRunCommand('sync')} disabled={commandLoading}>
        {commandLoading ? 'Running...' : 'Run Daily Sync'}
      </button>
      <button className="command-button" onClick={() => handleRunCommand('post_winners')} disabled={commandLoading}>
        {commandLoading ? 'Running...' : 'Post Weekly Winners'}
      </button>
      <button className="command-button danger" onClick={() => handleRunCommand('start_playoff')} disabled={commandLoading}>
        {commandLoading ? 'Running...' : 'START BIG PLAYOFF (Week 15)'}
      </button>
      <button className="command-button danger" onClick={() => handleRunCommand('run_elimination')} disabled={commandLoading}>
        {commandLoading ? 'Running...' : 'Run Playoff Elimination'}
      </button>
    </div>
  );

  const renderVenmoEditor = () => (
    <table className="standings-table">
      <thead>
        <tr>
          <th>Team Name</th>
          <th>Owner Name</th>
          <th>Venmo (@username)</th>
          <th>Save</th>
        </tr>
      </thead>
      <tbody>
        {teams.map(team => (
          team.owner ? (
            <tr key={team.id}>
              <td>{team.team_name}</td>
              <td>{team.owner.full_name}</td>
              <td>
                <input 
                  type="text"
                  className="venmo-input"
                  value={venmoInputs[team.owner.id] || ''}
                  onChange={(e) => handleVenmoChange(team.owner.id, e.target.value)}
                  placeholder="@venmo-username"
                />
              </td>
              <td>
                <button className="venmo-save-btn" onClick={() => handleVenmoSave(team.owner.id)}>
                  Save
                </button>
              </td>
            </tr>
          ) : null
        ))}
      </tbody>
    </table>
  );

  // --- THIS IS CHANGE #3 ---
  // This function now reads from 'teams' instead of 'allMembers'
  const renderDuesTracker = () => (
    <table className="standings-table">
      <thead>
        <tr>
          <th>Owner Name</th>
          <th>Team Name</th>
          <th>Has Paid Dues?</th>
        </tr>
      </thead>
      <tbody>
        {teams.map(team => (
          team.owner ? ( // Only show teams with owners
            <tr key={team.owner.id}>
              <td>{team.owner.full_name}</td>
              <td>{team.team_name}</td>
              <td>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={team.owner.has_paid_dues}
                    onChange={() => handleToggleDues(team.owner.id)}
                  />
                  <span className="slider"></span>
                </label>
              </td>
            </tr>
          ) : null
        ))}
      </tbody>
    </table>
  );

  const renderPlayoffEditor = () => (
    // ... (This function is unchanged)
    <table className="standings-table">
      <thead>
        <tr>
          <th>Team Name</th>
          <th>Owner Name</th>
          <th>Record (W-L-T)</th>
          <th>Manual Playoff Flag</th>
        </tr>
      </thead>
      <tbody>
        {teams.map(team => (
          team.owner ? (
            <tr key={team.id}>
              <td>{team.team_name}</td>
              <td>{team.owner.full_name}</td>
              <td>{team.wins}-{team.losses}-{team.ties}</td>
              <td>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={team.made_league_playoffs}
                    onChange={() => handleTogglePlayoffFlag(team.id)}
                  />
                  <span className="slider"></span>
                </label>
              </td>
            </tr>
          ) : null
        ))}
      </tbody>
    </table>
  );
  
  // --- Main Render Function ---
  
  const renderActiveTabContent = () => {
    // ... (This function is unchanged)
    if (dataLoading) return <p>Loading data...</p>;
    
    switch(activeTab) {
      case 'commands':
        return renderCommandCenter();
      case 'venmo':
        return renderVenmoEditor();
      case 'dues':
        return renderDuesTracker();
      case 'playoffs':
        return renderPlayoffEditor();
      default:
        return null;
    }
  };

  // --- THIS IS CHANGE #4 ---
  // We've added 'dues' to this list
  const renderLeagueSubTabs = () => {
    if (activeTab !== 'venmo' && activeTab !== 'playoffs' && activeTab !== 'dues') {
      return null;
    }
    
    return (
      <div className="league-tabs">
        {leagues.map(league => (
          <button
            key={league.id}
            className={`tab ${selectedLeagueId === league.id ? 'active' : ''}`}
            onClick={() => setSelectedLeagueId(league.id)}
          >
            {league.name}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Command Center</h1>
      
      {/* Main Tab Navigation (Unchanged) */}
      <nav className="admin-main-tabs">
        <button className={`admin-main-tab ${activeTab === 'commands' ? 'active' : ''}`} onClick={() => setActiveTab('commands')}>
          Commands
        </button>
        <button className={`admin-main-tab ${activeTab === 'venmo' ? 'active' : ''}`} onClick={() => setActiveTab('venmo')}>
          Venmo Editor
        </button>
        <button className={`admin-main-tab ${activeTab === 'dues' ? 'active' : ''}`} onClick={() => setActiveTab('dues')}>
          Dues Tracker
        </button>
        <button className={`admin-main-tab ${activeTab === 'playoffs' ? 'active' : ''}`} onClick={() => setActiveTab('playoffs')}>
          Playoff Editor
        </button>
      </nav>

      {/* Status Message Area (Unchanged) */}
      {statusMessage.text && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Content Area (Unchanged) */}
      <section className="admin-section">
        {renderLeagueSubTabs()}
        {renderActiveTabContent()}
      </section>
    </div>
  );
}

export default AdminDashboard;