import React, { useState } from 'react';
import OrganizerTab from './OrganizerTab';
import MemberRosterTab from './MemberRosterTab';
import OperationsTab from './OperationsTab';
import BigPlayoffTab from './BigPlayoffTab';
import './AdminDashboard.css';
import './DashboardPage.css';
import './LeagueDetailPage.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('operations');

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'operations': return <OperationsTab />;
      case 'bigplayoff': return <BigPlayoffTab />;
      case 'organizer':  return <OrganizerTab />;
      case 'members':    return <MemberRosterTab />;
      default:           return null;
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Command Center</h1>

      <nav className="admin-main-tabs">
        <button className={`admin-main-tab ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>
          Operations
        </button>
        <button className={`admin-main-tab ${activeTab === 'bigplayoff' ? 'active' : ''}`} onClick={() => setActiveTab('bigplayoff')}>
          BIG Playoff
        </button>
        <button className={`admin-main-tab ${activeTab === 'organizer' ? 'active' : ''}`} onClick={() => setActiveTab('organizer')}>
          Organizer
        </button>
        <button className={`admin-main-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          Members
        </button>
      </nav>

      <section className="admin-section">
        {renderActiveTabContent()}
      </section>
    </div>
  );
}

export default AdminDashboard;
