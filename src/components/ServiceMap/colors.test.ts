import { describe, it, expect } from 'vitest';
import {
  getTrafficColor,
  getVerdictColor,
  getThreatColor,
  getNodeIconColor,
  getTrafficLabel,
} from './colors';

describe('colors helpers', () => {
  describe('getTrafficColor', () => {
    const colors = {
      primary: '#3B82F6',
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981',
      textSecondary: '#9CA3AF',
      border: '#E5E7EB',
      cardBg: '#FFFFFF',
      headerBg: '#F8F9FA',
      sectionBg: '#F0F1F4',
    };

    it('returns error color when error rate > 5%', () => {
      expect(getTrafficColor(0.06, 100, colors)).toBe('#EF4444');
    });

    it('returns success color when request rate > 0 and no errors', () => {
      expect(getTrafficColor(0, 50, colors)).toBe('#10B981');
    });

    it('returns text secondary when no traffic', () => {
      expect(getTrafficColor(0, 0, colors)).toBe('#9CA3AF');
    });
  });

  describe('getVerdictColor', () => {
    it('returns red for dropped verdict', () => {
      expect(getVerdictColor('dropped')).toBe('#EF4444');
    });

    it('returns orange for denied verdict', () => {
      expect(getVerdictColor('denied')).toBe('#F59E0B');
    });

    it('returns green for forwarded verdict', () => {
      expect(getVerdictColor('forwarded')).toBe('#10B981');
    });

    it('returns default for unknown verdict', () => {
      expect(getVerdictColor(undefined)).toBe('#9CA3AF');
    });
  });

  describe('getThreatColor', () => {
    it('returns red when threat ratio > 10%', () => {
      expect(getThreatColor(15, 100)).toBe('#ef5350');
    });

    it('returns orange when threat ratio > 3%', () => {
      expect(getThreatColor(5, 100)).toBe('#ff9800');
    });

    it('returns blue when threat ratio <= 3%', () => {
      expect(getThreatColor(2, 100)).toBe('#42a5f5');
    });

    it('returns blue when no requests', () => {
      expect(getThreatColor(0, 0)).toBe('#42a5f5');
    });
  });

  describe('getNodeIconColor', () => {
    it('returns purple for host', () => {
      expect(getNodeIconColor('host')).toBe('#8B5CF6');
    });

    it('returns indigo for world', () => {
      expect(getNodeIconColor('world')).toBe('#6366F1');
    });

    it('returns green for database', () => {
      expect(getNodeIconColor('database')).toBe('#10B981');
    });

    it('returns blue for unknown type', () => {
      expect(getNodeIconColor('service')).toBe('#3B82F6');
    });
  });

  describe('getTrafficLabel', () => {
    it('returns correct label for ingress', () => {
      expect(getTrafficLabel('ingress')).toBe('pass req to next');
    });

    it('returns correct label for egress', () => {
      expect(getTrafficLabel('egress')).toBe('pass req out');
    });

    it('returns null for internal', () => {
      expect(getTrafficLabel('internal')).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(getTrafficLabel(undefined)).toBeNull();
    });
  });
});
