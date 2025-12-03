import { describe, it, expect } from 'vitest';
import { toFlat } from '.';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
}

const mockUsers: User[] = [
  { id: 1, name: 'Alice', role: 'admin', active: true },
  { id: 2, name: 'Bob', role: 'user', active: true },
  { id: 3, name: 'Charlie', role: 'admin', active: false },
  { id: 4, name: 'David', role: 'user', active: false },
  { id: 5, name: 'Eve', role: 'user', active: true },
];

describe('toFlat function', () => {
  it('should return the original list wrapped in an array when no accessors are provided', () => {
    const result = toFlat(mockUsers, []);
    
    expect(result).toEqual([
      {
        keys: [],
        values: mockUsers,
      },
    ]);
    expect(result[0].keys).toHaveLength(0);
  });

  it('should index correctly with a single string accessor (role)', () => {
    const result = toFlat(mockUsers, [item => item.role]);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      keys: ['admin'],
      values: [mockUsers[0], mockUsers[2]],
    });
    expect(result).toContainEqual({
      keys: ['user'],
      values: [mockUsers[1], mockUsers[3], mockUsers[4]],
    });
    expect(result[0].keys).toHaveLength(1);
  });

  it('should index correctly with a single number accessor (id)', () => {
    const result = toFlat(mockUsers, [item => item.id]);

    expect(result).toHaveLength(5); // Each user gets their own entry
    expect(result[0]).toEqual({ keys: [1], values: [mockUsers[0]] });
    expect(result[4].keys).toEqual([5]);
  });

  it('should handle multi-level indexing with mixed string/number keys', () => {
    const result = toFlat(mockUsers, [
      item => item.role,
      item => item.active ? 'active' : 'inactive',
    ]);

    expect(result).toHaveLength(4); // admin/active, admin/inactive, user/active, user/inactive
    expect(result).toContainEqual({
      keys: ['admin', 'active'],
      values: [mockUsers[0]],
    });
    expect(result).toContainEqual({
      keys: ['admin', 'inactive'],
      values: [mockUsers[2]],
    });
    expect(result).toContainEqual({
      keys: ['user', 'active'],
      values: [mockUsers[1], mockUsers[4]],
    });
    expect(result).toContainEqual({
        keys: ['user', 'inactive'],
        values: [mockUsers[3]],
      });
  });

  it('should return an empty array for an empty input list', () => {
    const result = toFlat([] as {role: string}[], [item => item.role]);
    expect(result).toEqual([]);
  });
});
