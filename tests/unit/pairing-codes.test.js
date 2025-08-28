const { describe, test, expect, beforeEach } = require('@jest/globals');
const encryptionService = require('../../src/services/encryptionService');
const {
  isValidPairingCode,
  isValidUUIDPairingCode,
  isValidShortPairingCode,
  isValidLegacyPairingCode,
  detectPairingCodeFormat,
} = require('../../src/utils/validation');

describe('Pairing Code Generation and Validation', () => {
  describe('UUID Pairing Code Generation', () => {
    test('should generate valid UUID v4 format', () => {
      const uuid = encryptionService.generateUUIDPairingCode();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
      expect(uuid).toHaveLength(36);
    });

    test('should generate unique UUIDs', () => {
      const uuid1 = encryptionService.generateUUIDPairingCode();
      const uuid2 = encryptionService.generateUUIDPairingCode();

      expect(uuid1).not.toBe(uuid2);
    });

    test('should generate UUID with correct version and variant bits', () => {
      const uuid = encryptionService.generateUUIDPairingCode();
      const parts = uuid.split('-');

      // Version 4: first character of third group should be '4'
      expect(parts[2][0]).toBe('4');

      // Variant: first character of fourth group should be '8', '9', 'a', or 'b'
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0]);
    });
  });

  describe('Short Format Pairing Code Generation', () => {
    test('should generate 12-character hex string', () => {
      const shortCode = encryptionService.generateShortPairingCode();

      expect(shortCode).toHaveLength(12);
      expect(shortCode).toMatch(/^[0-9a-f]{12}$/i);
    });

    test('should generate unique short codes', () => {
      const code1 = encryptionService.generateShortPairingCode();
      const code2 = encryptionService.generateShortPairingCode();

      expect(code1).not.toBe(code2);
    });
  });

  describe('Format-Based Generation', () => {
    test('should generate UUID when format is "uuid"', () => {
      const code = encryptionService.generatePairingCode('uuid');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(code).toMatch(uuidRegex);
      expect(code).toHaveLength(36);
    });

    test('should generate short code when format is "short"', () => {
      const code = encryptionService.generatePairingCode('short');

      expect(code).toHaveLength(12);
      expect(code).toMatch(/^[0-9a-f]{12}$/i);
    });

    test('should default to UUID when no format specified', () => {
      const code = encryptionService.generatePairingCode();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(code).toMatch(uuidRegex);
    });

    test('should default to UUID for invalid format', () => {
      const code = encryptionService.generatePairingCode('invalid');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(code).toMatch(uuidRegex);
    });
  });

  describe('Pairing Code Validation', () => {
    describe('UUID Validation', () => {
      test('should validate correct UUID format', () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        expect(isValidUUIDPairingCode(validUUID)).toBe(true);
        expect(isValidPairingCode(validUUID)).toBe(true);
      });

      test('should reject invalid UUID format', () => {
        const invalidUUIDs = [
          '123e4567-e89b-12d3-a456-42661417400', // too short
          '123e4567-e89b-12d3-a456-4266141740000', // too long
          '123e4567-e89b-12d3-a456-42661417400g', // invalid character
          '123e4567-e89b-12d3-a456-42661417400', // missing character
          '123e4567-e89b-12d3-a456', // missing parts
          'not-a-uuid-at-all',
        ];

        invalidUUIDs.forEach(uuid => {
          expect(isValidUUIDPairingCode(uuid)).toBe(false);
          expect(isValidPairingCode(uuid)).toBe(false);
        });
      });

      test('should validate UUID v4 format specifically', () => {
        const uuidV4 = '123e4567-e89b-42d3-a456-426614174000'; // version 4
        const uuidV1 = '123e4567-e89b-12d3-a456-426614174000'; // version 1

        expect(isValidUUIDPairingCode(uuidV4)).toBe(true);
        expect(isValidUUIDPairingCode(uuidV1)).toBe(true); // Still valid UUID
      });
    });

    describe('Short Format Validation', () => {
      test('should validate correct short format', () => {
        const validShort = '38836d2c4498';
        expect(isValidShortPairingCode(validShort)).toBe(true);
        expect(isValidPairingCode(validShort)).toBe(true);
      });

      test('should reject invalid short format', () => {
        const invalidShorts = [
          '38836d2c449', // too short
          '38836d2c44980', // too long
          '38836d2c449g', // invalid character
          '38836d2c449', // missing character
          'not-a-short-code',
        ];

        invalidShorts.forEach(code => {
          expect(isValidShortPairingCode(code)).toBe(false);
          expect(isValidPairingCode(code)).toBe(false);
        });
      });
    });

    describe('Legacy Format Validation', () => {
      test('should validate correct legacy format', () => {
        const validLegacy = '123456';
        expect(isValidLegacyPairingCode(validLegacy)).toBe(true);
        expect(isValidPairingCode(validLegacy)).toBe(true);
      });

      test('should reject invalid legacy format', () => {
        const invalidLegacy = [
          '12345', // too short
          '1234567', // too long
          '12345a', // non-numeric
          '12345', // missing digit
          'not-numeric',
        ];

        invalidLegacy.forEach(code => {
          expect(isValidLegacyPairingCode(code)).toBe(false);
          expect(isValidPairingCode(code)).toBe(false);
        });
      });
    });

    describe('Format Detection', () => {
      test('should detect UUID format correctly', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        expect(detectPairingCodeFormat(uuid)).toBe('uuid');
      });

      test('should detect short format correctly', () => {
        const short = '38836d2c4498';
        expect(detectPairingCodeFormat(short)).toBe('short');
      });

      test('should detect legacy format correctly', () => {
        const legacy = '123456';
        expect(detectPairingCodeFormat(legacy)).toBe('legacy');
      });

      test('should detect unknown format', () => {
        const unknown = 'invalid-code';
        expect(detectPairingCodeFormat(unknown)).toBe('unknown');
      });

      test('should handle edge cases', () => {
        expect(detectPairingCodeFormat('')).toBe('unknown');
        expect(detectPairingCodeFormat(null)).toBe('unknown');
        expect(detectPairingCodeFormat(undefined)).toBe('unknown');
        expect(detectPairingCodeFormat(123)).toBe('unknown');
      });
    });

    describe('Backward Compatibility', () => {
      test('should accept all valid formats', () => {
        const formats = [
          '123e4567-e89b-12d3-a456-426614174000', // UUID
          '38836d2c4498', // Short
          '123456', // Legacy
        ];

        formats.forEach(code => {
          expect(isValidPairingCode(code)).toBe(true);
        });
      });

      test('should reject invalid formats', () => {
        const invalidFormats = [
          'invalid',
          '123',
          '123e4567-e89b-12d3-a456-42661417400g',
          '38836d2c449g',
          '12345a',
        ];

        invalidFormats.forEach(code => {
          expect(isValidPairingCode(code)).toBe(false);
        });
      });
    });
  });

  describe('Security Considerations', () => {
    test('UUID should have sufficient entropy', () => {
      const uuids = Array.from({ length: 1000 }, () => encryptionService.generateUUIDPairingCode());
      const uniqueUuids = new Set(uuids);

      // All generated UUIDs should be unique
      expect(uniqueUuids.size).toBe(1000);
    });

    test('Short codes should have sufficient entropy', () => {
      const codes = Array.from({ length: 1000 }, () => encryptionService.generateShortPairingCode());
      const uniqueCodes = new Set(codes);

      // All generated codes should be unique
      expect(uniqueCodes.size).toBe(1000);
    });

    test('should not generate predictable patterns', () => {
      const codes = Array.from({ length: 100 }, () => encryptionService.generatePairingCode('uuid'));

      // Check that codes don't follow obvious patterns
      const firstChars = codes.map(code => code[0]);
      const uniqueFirstChars = new Set(firstChars);

      // Should have variety in first characters
      expect(uniqueFirstChars.size).toBeGreaterThan(5);
    });
  });

  describe('Performance', () => {
    test('should generate codes quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        encryptionService.generatePairingCode('uuid');
      }

      const duration = Date.now() - start;

      // Should generate 1000 codes in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should validate codes quickly', () => {
      const codes = Array.from({ length: 1000 }, () => encryptionService.generatePairingCode('uuid'));

      const start = Date.now();

      codes.forEach(code => {
        isValidPairingCode(code);
        detectPairingCodeFormat(code);
      });

      const duration = Date.now() - start;

      // Should validate 1000 codes in less than 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});
