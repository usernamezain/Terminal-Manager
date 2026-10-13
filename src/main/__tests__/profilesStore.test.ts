import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ProfilesStore } from '../profilesStore';
import { TerminalProfile } from '../../shared/types';

describe('ProfilesStore Unit & Speed Optimization Tests', () => {
  const testUserData = path.join(process.cwd(), 'scratch', 'test-profiles-store');

  beforeEach(() => {
    if (fs.existsSync(testUserData)) {
      fs.rmSync(testUserData, { recursive: true, force: true });
    }
    fs.mkdirSync(testUserData, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testUserData)) {
      fs.rmSync(testUserData, { recursive: true, force: true });
    }
  });

  it('should initialize and create default profiles if none exist', () => {
    const store = new ProfilesStore(testUserData);
    store.init();

    const all = store.getAll();
    expect(all.length).toBeGreaterThan(0);

    const def = store.getDefault();
    expect(def).toBeDefined();
    expect(def?.isDefault).toBe(true);

    // Verify file created on disk
    const filePath = path.join(testUserData, 'profiles.json');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should perform O(1) in-memory profile lookups in under 1ms', () => {
    const store = new ProfilesStore(testUserData);
    store.init();

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const def = store.getDefault();
      expect(def).toBeDefined();
    }
    const elapsed = performance.now() - start;
    // 1000 lookups should take less than 150ms total even under heavy test load
    expect(elapsed).toBeLessThan(150);
  });

  it('should save and update profiles atomically', () => {
    const store = new ProfilesStore(testUserData);
    store.init();

    const newProfile: TerminalProfile = {
      id: 'profile-custom-test',
      name: 'Custom Node Runner',
      shellPath: 'node.exe',
      shellArgs: ['-i'],
      cwd: 'C:\\Projects',
      icon: 'code',
      color: '#10B981',
      env: { NODE_ENV: 'development' },
      isDefault: false,
      elevate: false,
    };

    const saved = store.save(newProfile);
    expect(saved.id).toBe('profile-custom-test');
    expect(store.getById('profile-custom-test')).toBeDefined();
    expect(store.getById('profile-custom-test')?.env?.NODE_ENV).toBe('development');

    // Update profile
    const updated = store.save({
      ...newProfile,
      name: 'Updated Node Runner',
      color: '#F59E0B',
    });

    expect(updated.name).toBe('Updated Node Runner');
    expect(store.getById('profile-custom-test')?.color).toBe('#F59E0B');

    // Verify persisted on disk
    const content = JSON.parse(fs.readFileSync(path.join(testUserData, 'profiles.json'), 'utf8'));
    const onDisk = content.find((p: any) => p.id === 'profile-custom-test');
    expect(onDisk).toBeDefined();
    expect(onDisk.name).toBe('Updated Node Runner');
  });

  it('should change default profile and maintain single default invariant', () => {
    const store = new ProfilesStore(testUserData);
    store.init();

    const initialDefault = store.getDefault();
    expect(initialDefault).toBeDefined();

    const secondProfile: TerminalProfile = {
      id: 'profile-second',
      name: 'Second Shell',
      shellPath: 'cmd.exe',
      shellArgs: [],
      isDefault: false,
    };
    store.save(secondProfile);

    const changed = store.setDefault('profile-second');
    expect(changed).toBe(true);

    const newDefault = store.getDefault();
    expect(newDefault?.id).toBe('profile-second');

    // The old default must no longer be default
    const oldDefaultRefreshed = store.getById(initialDefault!.id);
    expect(oldDefaultRefreshed?.isDefault).toBe(false);

    // Only one profile has isDefault === true
    const defaults = store.getAll().filter((p) => p.isDefault);
    expect(defaults.length).toBe(1);
  });

  it('should prevent deleting default profile and delete custom profile', () => {
    const store = new ProfilesStore(testUserData);
    store.init();

    const def = store.getDefault()!;
    // Trying to delete default profile should return false
    const deleteDefaultResult = store.delete(def.id);
    expect(deleteDefaultResult).toBe(false);
    expect(store.getById(def.id)).toBeDefined();

    // Create a custom profile and delete it
    store.save({
      id: 'profile-to-delete',
      name: 'To Delete',
      shellPath: 'cmd.exe',
      shellArgs: [],
      isDefault: false,
    });
    expect(store.getById('profile-to-delete')).toBeDefined();

    const deleteOk = store.delete('profile-to-delete');
    expect(deleteOk).toBe(true);
    expect(store.getById('profile-to-delete')).toBeUndefined();
  });

  it('should detect system shells and merge without overwriting custom customizations', () => {
    const store = new ProfilesStore(testUserData);
    store.init();

    // Customize an existing or custom profile
    store.save({
      id: 'profile-my-powershell',
      name: 'My Special PowerShell',
      shellPath: 'powershell.exe',
      shellArgs: [],
      color: '#EC4899',
      isDefault: true,
    });

    const merged = store.detectAndMerge();
    expect(merged.length).toBeGreaterThan(0);

    // Custom profile is still intact
    const preserved = store.getById('profile-my-powershell');
    expect(preserved).toBeDefined();
    expect(preserved?.color).toBe('#EC4899');
  });
});
