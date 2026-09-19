import React, { useState } from 'react';
import { X, Download, Shield, Sparkles, Layers, Mic, HeartHandshake, Eye, Flame, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import yelloutLogoImg from '../assets/images/yellout_logo_1789808350358.jpg';
import yelloutChartImg from '../assets/images/yellout_chart_1789808362522.jpg';

interface ProductChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductChartModal: React.FC<ProductChartModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logo' | 'chart'>('logo');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  if (!isOpen) return null;

  const brandColors = [
    { name: '燃烬橙 (Ember Orange)', hex: '#f97316', desc: '情绪释放、炽热爆发与重生' },
    { name: '暗夜黑 (Obsidian Dark)', hex: '#070b14', desc: '深夜避难所、车库安全感与沉浸感' },
    { name: '温暖琥珀 (Warm Amber)', hex: '#f59e0b', desc: '同温层共情、无声的拥抱与支撑' },
    { name: '虚空灰 (Void Slate)', hex: '#1e293b', desc: '匿名底色、焚毁后的释然归零' },
  ];

  const handleCopyColor = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* 顶栏 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <img
                src={yelloutLogoImg}
                alt="YellOut Logo"
                className="w-8 h-8 rounded-lg object-cover border border-amber-500/40 shadow-sm shadow-amber-500/20"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>YellOut / YellZone 品牌与产品全景</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Design Asset
                  </span>
                </h2>
                <p className="text-xs text-slate-400">极简语音发泄与情绪避难所设计资产</p>
              </div>
            </div>

            {/* 切换 Tab 与关闭按钮 */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  onClick={() => setActiveTab('logo')}
                  className={`px-3 py-1 rounded-md transition-all font-medium ${
                    activeTab === 'logo'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  品牌 Logo
                </button>
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`px-3 py-1 rounded-md transition-all font-medium ${
                    activeTab === 'chart'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  产品架构图表
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-2"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === 'logo' ? (
              <div className="space-y-6">
                {/* Logo 展示区 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Logo 大图预览 */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                      <img
                        src={yelloutLogoImg}
                        alt="YellOut Official Brand Logo"
                        className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover shadow-2xl border border-amber-500/30"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <a
                        href={yelloutLogoImg}
                        download="yellout_logo.jpg"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下载高清原图 (1:1)
                      </a>
                    </div>
                  </div>

                  {/* Logo 设计理念说明 */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                        Design Rationale
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                        「声波破晓，咆哮释然」
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed mt-2">
                        YellOut 的 Logo 融汇了<strong>声波扩散</strong>与<strong>自由咆哮</strong>的双重视象。线条如同在深夜汽车驾驶舱内骤然爆发的高能声学震荡波，穿透中年人长久压抑的心防。
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                        <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5" /> 声波共鸣律动
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          象征纯粹的语音驱动，把文字无法言说的沉重通过音波直接倾泻。
                        </p>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                        <div className="text-orange-400 font-bold mb-1 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5" /> 燃烬与安全感
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          暗黑与暖橙交融，代表黑夜里的避难所，咆哮过后回归平静。
                        </p>
                      </div>
                    </div>

                    {/* 品牌色板 */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 mb-2">品牌标准调色板：</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {brandColors.map((color) => (
                          <div
                            key={color.hex}
                            onClick={() => handleCopyColor(color.hex)}
                            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-colors text-left group"
                          >
                            <div
                              className="w-full h-8 rounded mb-1.5 border border-white/10"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div className="text-[11px] font-mono text-slate-200 flex items-center justify-between">
                              <span>{color.hex}</span>
                              {copiedColor === color.hex ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 text-[9px] text-amber-400">复制</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{color.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 产品全景架构图表展示 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>YellOut 产品架构与功能流转图 (Product Architecture)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        涵盖发泄舱、隐私脱敏引擎、同温层共情广场与心理安全网四维架构
                      </p>
                    </div>

                    <a
                      href={yelloutChartImg}
                      download="yellout_architecture_chart.jpg"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载架构大图
                    </a>
                  </div>

                  {/* 架构图大图渲染 */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden group">
                    <img
                      src={yelloutChartImg}
                      alt="YellOut Product Architecture Diagram"
                      className="w-full h-auto rounded-lg object-contain max-h-[460px] mx-auto border border-slate-800 group-hover:border-amber-500/40 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* 模块明细拆解 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Mic className="w-4 h-4" />
                        <span>1. 极简发泄舱</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        <strong>目标标签精准倒出</strong>：领导/伴侣/客户/房贷/生活。长按一键录音，上滑火焰实时焚毁入虚空。
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                        <Shield className="w-4 h-4" />
                        <span>2. 隐私与变声引擎</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        <strong>实时 DSP 调音脱敏</strong>：重低音炮/电音机甲/空灵虚空，彻底抹除声纹特征，24小时定时自毁。
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <HeartHandshake className="w-4 h-4" />
                        <span>3. 同温层共情广场</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        <strong>非语言式纯粹回应</strong>：仅允许抱抱、懂你、轻拍肩等无负担微反馈，拒绝键盘侠与说教。
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <Sparkles className="w-4 h-4" />
                        <span>4. 危机情绪守护</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        <strong>温情托底安全网</strong>：ASR 负向极端情绪智能识别，无缝接驳 24 小时全国心理危机援助热线。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底栏 */}
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
            <span>© YellOut Project / YellZone · Open Sanctuary for Middle-Aged Emotion</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
            >
              完成预览
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
