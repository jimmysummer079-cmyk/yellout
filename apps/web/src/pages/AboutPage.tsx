import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-10">
      <section className="relative -mx-4 sm:mx-0 overflow-hidden sm:rounded-2xl border-y sm:border border-void-border min-h-[14rem]">
        <img
          src="/yellout-logo.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end min-h-[14rem] p-6">
          <h1 className="font-display text-4xl sm:text-5xl text-snow">YellOut</h1>
          <p className="mt-2 text-amber text-sm">声波破晓 · 咆哮释然</p>
          <p className="mt-3 text-sm text-mist max-w-md text-balance">
            面向 30–55 岁成年人的匿名语音发泄与同温层互慰树洞。
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-snow">为什么存在</h2>
        <p className="text-sm text-mist leading-relaxed">
          中年人的压力往往来自「不能倒下」的社会角色——工作中不能发泄，家里不能抱怨。
          YellOut 提供一个绝对安全、极简、无负担的情绪出海口：按住倾诉，变声脱敏，松手送出或焚入虚空。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-snow">品牌色</h2>
        <ul className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['燃烬橙 Ember', '#F97316'],
            ['暗夜黑 Obsidian', '#070B14'],
            ['温暖琥珀 Amber', '#F59E0B'],
            ['虚空灰 Void', '#1E293B'],
          ].map(([name, hex]) => (
            <li key={hex} className="flex items-center gap-2 p-2 rounded-xl border border-void-border bg-void/40">
              <span className="w-8 h-8 rounded-lg border border-white/10" style={{ background: hex }} />
              <span>
                <div className="text-snow font-medium">{name}</div>
                <div className="text-mist font-mono">{hex}</div>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-snow">产品全景</h2>
        <img
          src="/yellout-chart.jpg"
          alt="YellOut 产品架构图"
          className="w-full rounded-xl border border-void-border"
        />
      </section>

      <p className="text-xs text-mist">
        <Link to="/privacy" className="underline hover:text-amber">
          隐私政策
        </Link>
        {' · '}
        <Link to="/terms" className="underline hover:text-amber">
          使用条款
        </Link>
        {' · '}
        <Link to="/" className="underline hover:text-amber">
          返回树洞
        </Link>
      </p>
    </div>
  );
}
