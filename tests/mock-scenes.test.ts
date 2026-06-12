import { describe, it, expect } from 'vitest';
import { matchScene, getSceneNames } from '@/lib/nlu/MockSceneService';

describe('MockSceneService', () => {
  it('命中房子', async () => {
    const objs = await matchScene('画一个房子');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(3);
  });

  it('命中笑脸', async () => {
    const objs = await matchScene('画个笑脸');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(3);
  });

  it('命中太阳和树', async () => {
    const objs = await matchScene('画太阳和树');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(5);
  });

  it('命中田园风光', async () => {
    const objs = await matchScene('田园风光');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(5);
  });

  it('命中雪人', async () => {
    const objs = await matchScene('画个雪人');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(4);
  });

  it('命中交通灯', async () => {
    const objs = await matchScene('画红绿灯');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(3);
  });

  it('命中爱心', async () => {
    const objs = await matchScene('画一颗心');
    expect(objs).not.toBeNull();
  });

  it('命中彩虹', async () => {
    const objs = await matchScene('彩虹');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(5);
  });

  it('命中圣诞树', async () => {
    const objs = await matchScene('画圣诞树');
    expect(objs).not.toBeNull();
    expect(objs!.length).toBeGreaterThanOrEqual(4);
  });

  it('命中太极图', async () => {
    const objs = await matchScene('画太极');
    expect(objs).not.toBeNull();
  });

  it('不命中：普通指令', async () => {
    const objs = await matchScene('画一个红色圆');
    expect(objs).toBeNull();
  });

  it('getSceneNames 返回所有场景', () => {
    const names = getSceneNames();
    expect(names.length).toBeGreaterThanOrEqual(1);
  });
});
