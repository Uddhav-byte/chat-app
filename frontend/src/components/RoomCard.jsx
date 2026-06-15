const RoomCard = ({ room, isActive, onClick }) => {
  return (
    <div className={`list-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div 
        className="avatar" 
        style={{ 
          background: isActive ? 'var(--primary)' : 'rgba(30, 41, 59, 0.8)',
          color: isActive ? 'white' : 'var(--text-main)',
          border: isActive ? 'none' : '1px solid var(--border-light)'
        }}
      >
        {room.name.charAt(0).toUpperCase()}
      </div>
      <div className="item-info">
        <div className="item-name">{room.name}</div>
        <div className="item-sub">
          {room.members?.length || 0} members
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
