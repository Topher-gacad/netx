import { useStore } from 'zustand';
import { bootcampStore, navigateTo } from '../bootcamp-store.js';
import { curriculum } from '../curriculum/index.js';
import type { BadgeDefinition } from '../types.js';

const TIER_COLORS = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };

export function BadgeDisplay({ badge }: { badge: BadgeDefinition }) {
  const { progress } = useStore(bootcampStore);

  // Find the next module
  const currentModule = curriculum.modules.find((m) => m.badge.id === badge.id);
  const nextModule = currentModule ? curriculum.modules.find((m) => m.number === currentModule.number + 1) : null;

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '400px', margin: '0 auto' }}>
      {/* Badge icon with glow */}
      <div style={{
        fontSize: '64px', marginBottom: '16px',
        filter: `drop-shadow(0 0 20px ${badge.color}50)`,
      }}>
        {badge.icon}
      </div>

      {/* Badge name */}
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: badge.color, margin: '0 0 8px' }}>
        {badge.name}
      </h2>

      {/* Tier */}
      <div style={{
        display: 'inline-block', padding: '3px 12px', borderRadius: '12px',
        background: TIER_COLORS[badge.tier] + '25', color: TIER_COLORS[badge.tier],
        fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px',
      }}>
        {badge.tier}
      </div>

      {/* Description */}
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 24px' }}>
        {badge.description}
      </p>

      {/* Celebration message */}
      <div style={{
        padding: '16px', background: badge.color + '10', borderRadius: '8px',
        border: `1px solid ${badge.color}30`, marginBottom: '24px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: badge.color, marginBottom: '4px' }}>
          Congratulations!
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          XP: {progress.totalXP} | Badges: {progress.badges.length}/{curriculum.modules.length}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {nextModule && (
          <button
            onClick={() => navigateTo('module', nextModule.id)}
            style={{
              padding: '10px 24px', background: nextModule.color, border: 'none',
              borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Next: {nextModule.title}
          </button>
        )}
        <button
          onClick={() => navigateTo('roadmap')}
          style={{
            padding: '10px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer',
          }}
        >
          View Roadmap
        </button>
      </div>

      {/* Badge gallery */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Your Badges
        </h3>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {curriculum.modules.map((m) => {
            const earned = progress.badges.includes(m.badge.id);
            return (
              <div key={m.badge.id} style={{
                width: '44px', height: '44px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: earned ? m.color + '15' : 'var(--bg-secondary)',
                border: `1px solid ${earned ? m.color + '40' : 'var(--border-color)'}`,
                fontSize: '20px', opacity: earned ? 1 : 0.3,
              }} title={earned ? m.badge.name : 'Locked'}>
                {m.badge.icon}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
