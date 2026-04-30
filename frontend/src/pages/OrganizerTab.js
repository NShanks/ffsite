import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import {
  fetchSeasons,
  createSeason,
  patchSeason,
  fetchOrganizer,
  createPlannedLeague,
  patchPlannedLeague,
  deletePlannedLeague,
  assignMember,
  unassignMember,
  toggleSeasonDues,
} from '../api/authApi';
import './OrganizerTab.css';

// ── Droppable column ──────────────────────────────────────────────────────────

function LeagueColumn({ league, members, onRename, onSetLeagueId, onDelete, onDuesToggle }) {
  const { setNodeRef, isOver } = useDroppable({ id: `league-${league.id}` });
  const [nameEditing, setNameEditing]     = useState(false);
  const [nameValue,   setNameValue]       = useState(league.name);
  const [sleeperIdVal, setSleeperIdVal]   = useState(league.sleeper_league_id || '');

  const handleNameBlur = () => {
    setNameEditing(false);
    if (nameValue.trim() && nameValue !== league.name) onRename(league.id, nameValue.trim());
  };

  const handleSleeperIdBlur = () => {
    if (sleeperIdVal !== (league.sleeper_league_id || '')) {
      onSetLeagueId(league.id, sleeperIdVal.trim() || null);
    }
  };

  return (
    <div className={`org-column${isOver ? ' org-column-over' : ''}`}>
      <div className="org-column-header">
        {nameEditing ? (
          <input
            className="org-column-name-input"
            value={nameValue}
            autoFocus
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        ) : (
          <span className="org-column-name" onClick={() => setNameEditing(true)} title="Click to rename">
            {league.name}
          </span>
        )}
        <span className="org-column-count">{members.length}</span>
        <button className="org-delete-btn" onClick={() => onDelete(league.id)} title="Remove league">✕</button>
      </div>

      <div className="org-sleeper-id-row">
        <input
          className="org-sleeper-id-input"
          value={sleeperIdVal}
          onChange={(e) => setSleeperIdVal(e.target.value)}
          onBlur={handleSleeperIdBlur}
          placeholder="Sleeper League ID"
        />
      </div>

      <div className="org-column-cards" ref={setNodeRef}>
        {members.map((m) => (
          <MemberCard key={m.id} member={m} onDuesToggle={onDuesToggle} />
        ))}
        {members.length === 0 && (
          <div className="org-column-empty">Drop members here</div>
        )}
      </div>
    </div>
  );
}

// ── Unassigned column (also droppable) ────────────────────────────────────────

function UnassignedColumn({ members, onDuesToggle }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' });
  return (
    <div className={`org-column org-column-unassigned${isOver ? ' org-column-over' : ''}`}>
      <div className="org-column-header">
        <span className="org-column-name">Unassigned</span>
        <span className="org-column-count">{members.length}</span>
      </div>
      <div className="org-column-cards" ref={setNodeRef}>
        {members.map((m) => (
          <MemberCard key={m.id} member={m} onDuesToggle={onDuesToggle} />
        ))}
        {members.length === 0 && (
          <div className="org-column-empty">All members assigned</div>
        )}
      </div>
    </div>
  );
}

// ── Draggable member card ─────────────────────────────────────────────────────

function MemberCard({ member, onDuesToggle, isDragOverlay = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member-${member.id}`,
    disabled: isDragOverlay,
  });

  const displayName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username;

  return (
    <div
      ref={setNodeRef}
      className={`org-member-card${isDragging ? ' org-member-dragging' : ''}`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="org-member-drag-handle" {...listeners} {...attributes}>⠿</div>
      <div className="org-member-info">
        <span className="org-member-name">{displayName}</span>
        <span className="org-member-sub">@{member.username} · {member.sleeper_display_name || '—'}</span>
        {(member.email || member.phone) && (
          <span className="org-member-contact">{member.email}{member.email && member.phone ? ' · ' : ''}{member.phone}</span>
        )}
      </div>
      {onDuesToggle && (
        <button
          className={`org-dues-btn${member.dues_paid ? ' paid' : ''}`}
          onClick={() => onDuesToggle(member.id)}
          title={member.dues_paid ? 'Mark unpaid' : 'Mark paid'}
        >
          {member.dues_paid ? '✓' : '$'}
        </button>
      )}
    </div>
  );
}

// ── New Season modal ──────────────────────────────────────────────────────────

function NewSeasonModal({ onClose, onCreate }) {
  const [year,  setYear]  = useState(new Date().getFullYear() + 1);
  const [label, setLabel] = useState('');
  const [err,   setErr]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await onCreate({ year: Number(year), label: label || `${year} Season` });
      onClose();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="org-modal-backdrop" onClick={onClose}>
      <div className="org-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Season</h3>
        <form onSubmit={handleSubmit}>
          {err && <div className="org-modal-error">{err}</div>}
          <label>Year
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
          </label>
          <label>Label (optional)
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`${year} Season`} />
          </label>
          <div className="org-modal-actions">
            <button type="button" className="org-modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="org-modal-confirm">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main OrganizerTab ─────────────────────────────────────────────────────────

export default function OrganizerTab() {
  const [seasons,      setSeasons]      = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [organizer,    setOrganizer]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [activeId,     setActiveId]     = useState(null);
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [savingLeagueId, setSavingLeagueId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load seasons list
  const loadSeasons = useCallback(async () => {
    const data = await fetchSeasons();
    if (Array.isArray(data)) {
      setSeasons(data);
      if (!selectedYear && data.length > 0) {
        const active = data.find((s) => s.is_active) || data[0];
        setSelectedYear(active.year);
      }
    }
  }, [selectedYear]);

  useEffect(() => { loadSeasons(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load organizer state when year changes
  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    fetchOrganizer(selectedYear)
      .then(setOrganizer)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const reload = useCallback(() => {
    if (!selectedYear) return;
    fetchOrganizer(selectedYear).then(setOrganizer).catch(console.error);
  }, [selectedYear]);

  // Build lookup: memberId → leagueId
  const memberLeagueMap = {};
  if (organizer) {
    organizer.planned_leagues.forEach((league) => {
      // The OrganizerMemberSerializer sets assigned_league_id on each member
    });
    organizer.members.forEach((m) => {
      if (m.assigned_league_id != null) memberLeagueMap[m.id] = m.assigned_league_id;
    });
  }

  const getMembersForLeague = (leagueId) =>
    organizer?.members.filter((m) => m.assigned_league_id === leagueId) || [];

  const getUnassignedMembers = () =>
    organizer?.members.filter((m) => m.assigned_league_id == null) || [];

  const activeMember = activeId
    ? organizer?.members.find((m) => `member-${m.id}` === activeId)
    : null;

  // ── DnD handlers ─────────────────────────────────────────────────────────

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;

    const memberId = Number(active.id.replace('member-', ''));
    const targetId = over.id; // 'unassigned' or 'league-{id}'

    const member = organizer.members.find((m) => m.id === memberId);
    if (!member) return;

    if (targetId === 'unassigned') {
      if (member.assigned_league_id == null) return; // already unassigned
      const league = organizer.planned_leagues.find((l) => l.id === member.assigned_league_id);
      if (league) {
        await unassignMember(league.id, memberId);
        reload();
      }
    } else {
      const leagueId = Number(targetId.replace('league-', ''));
      if (member.assigned_league_id === leagueId) return; // already there
      await assignMember(leagueId, memberId);
      reload();
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddLeague = async () => {
    const n = (organizer?.planned_leagues.length || 0) + 1;
    await createPlannedLeague(selectedYear, { name: `League ${n}`, order: n });
    reload();
  };

  const handleRename = async (id, name) => {
    await patchPlannedLeague(id, { name });
    reload();
  };

  const handleSetLeagueId = async (id, sleeper_league_id) => {
    setSavingLeagueId(id);
    try {
      await patchPlannedLeague(id, { sleeper_league_id });
      reload();
    } finally {
      setSavingLeagueId(null);
    }
  };

  const handleDeleteLeague = async (id) => {
    if (!window.confirm('Remove this league slot? Assigned members will become unassigned.')) return;
    await deletePlannedLeague(id);
    reload();
  };

  const handleDuesToggle = async (memberId) => {
    await toggleSeasonDues(selectedYear, memberId);
    reload();
  };

  const handleCreateSeason = async (data) => {
    await createSeason(data);
    await loadSeasons();
    setSelectedYear(data.year);
  };

  const handleSetActive = async () => {
    if (!window.confirm(`Set ${selectedYear} as the active season? This will deactivate all other seasons.`)) return;
    await patchSeason(selectedYear, { is_active: true });
    loadSeasons();
    reload();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="org-tab">
      {showNewSeason && (
        <NewSeasonModal onClose={() => setShowNewSeason(false)} onCreate={handleCreateSeason} />
      )}

      <div className="org-toolbar">
        <div className="org-season-selector">
          <label className="org-season-label">Season</label>
          <select
            className="org-season-select"
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {seasons.map((s) => (
              <option key={s.year} value={s.year}>
                {s.label}{s.is_active ? ' ✦' : ''}
              </option>
            ))}
            {seasons.length === 0 && <option value="">No seasons yet</option>}
          </select>
          <button className="org-btn org-btn-secondary" onClick={() => setShowNewSeason(true)}>+ New Season</button>
        </div>

        <div className="org-toolbar-right">
          {organizer?.season && !organizer.season.is_active && (
            <button className="org-btn org-btn-primary" onClick={handleSetActive}>Set Active</button>
          )}
          <button className="org-btn org-btn-secondary" onClick={handleAddLeague} disabled={!selectedYear}>
            + Add League
          </button>
        </div>
      </div>

      {loading && <div className="org-loading">Loading…</div>}

      {!loading && organizer && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="org-board">
            <UnassignedColumn members={getUnassignedMembers()} onDuesToggle={handleDuesToggle} />

            {organizer.planned_leagues.map((league) => (
              <LeagueColumn
                key={league.id}
                league={league}
                members={getMembersForLeague(league.id)}
                onRename={handleRename}
                onSetLeagueId={handleSetLeagueId}
                onDelete={handleDeleteLeague}
                onDuesToggle={handleDuesToggle}
                saving={savingLeagueId === league.id}
              />
            ))}
          </div>

          <DragOverlay>
            {activeMember && <MemberCard member={activeMember} isDragOverlay />}
          </DragOverlay>
        </DndContext>
      )}

      {!loading && !organizer && selectedYear && (
        <div className="org-empty">No data for {selectedYear}. Add leagues and members will appear once they register.</div>
      )}

      {!loading && seasons.length === 0 && (
        <div className="org-empty">No seasons yet. Click "+ New Season" to get started.</div>
      )}
    </div>
  );
}
