/**
 * 动态代号系统
 * 严格遵循脱敏规范：随机生成代号（如：松柏 001），随发泄次数动态更新，切断用户历史轨迹
 */

const PREFIXES = [
  '松柏', '风霜', '沉石', '寒梅', '远山', '苍竹', '暮雨', '潜渊',
  '微芒', '独木', '晚枫', '孤舟', '青岩', '厚土', '静水', '荒原',
  '秋叶', '溯溪', '夜澜', '守望', '残阳', '晨曦', '破晓', '止水'
];

export function generateCodename(): string {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${prefix} ${num}`;
}
