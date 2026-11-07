import { describe, it, expect } from 'vitest';
import { CARD_WIDTH, CARD_HEIGHT, HEADER_HEIGHT, ACCESS_POINT_HEIGHT } from './types';

describe('service-map types', () => {
  describe('card dimensions', () => {
    it('exports correct card width', () => {
      expect(CARD_WIDTH).toBe(560);
    });

    it('exports correct card height', () => {
      expect(CARD_HEIGHT).toBe(200);
    });

    it('exports correct header height', () => {
      expect(HEADER_HEIGHT).toBe(52);
    });

    it('exports correct access point height', () => {
      expect(ACCESS_POINT_HEIGHT).toBe(44);
    });
  });
});
