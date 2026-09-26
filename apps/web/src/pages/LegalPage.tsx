import { Link } from 'react-router-dom';

interface LegalPageProps {
  kind: 'privacy' | 'terms';
}

export function LegalPage({ kind }: LegalPageProps) {
  const isPrivacy = kind === 'privacy';

  return (
    <article className="px-4 py-8 max-w-2xl mx-auto prose-invert">
      <h1 className="font-display text-3xl text-snow mb-2">
        {isPrivacy ? '隐私政策' : '使用条款'}
      </h1>
      <p className="text-xs text-mist mb-8">最后更新：2026-03-26 · YellOut / YellZone</p>

      {isPrivacy ? (
        <div className="space-y-5 text-sm text-mist leading-relaxed">
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">我们收集什么</h2>
            <p>
              不要求注册、不读取通讯录、不绑定社交账号。我们仅为匿名会话分配随机设备令牌与代号，
              并在你主动发送时存储变声后的语音文件、目标标签、波形摘要与互动数据。
            </p>
          </section>
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">「焚入虚空」</h2>
            <p>
              当你在录音中上滑触发焚毁时，音频仅在本地丢弃，不会上传至服务器，也不会写入数据库。
            </p>
          </section>
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">保存多久</h2>
            <p>
              广场倾诉默认在约 48 小时后自动过期；到期后删除数据库记录与对应音频文件。
              举报记录可能保留更久以便安全审核。
            </p>
          </section>
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">内容安全</h2>
            <p>
              我们可能使用自动化审核接口（若配置了 API Key）或本地启发式规则检测极端危机信号，
              以便展示心理援助热线。审核失败时系统会优雅降级，不影响基本发泄功能。
            </p>
          </section>
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">联系</h2>
            <p>如有隐私相关问题，请通过项目仓库 Issue 联系维护者。</p>
          </section>
        </div>
      ) : (
        <div className="space-y-5 text-sm text-mist leading-relaxed">
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">服务性质</h2>
            <p>
              YellOut 是情绪宣泄与同温层互慰工具，不是医疗机构，不提供诊疗、危机干预或紧急救助。
              若你处于危险中，请立即拨打当地紧急电话或页面内援助热线。
            </p>
          </section>
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">社区准则</h2>
            <p>
              禁止仇恨、骚扰、违法内容与恶意滥用。你可以举报不当内容；我们可能删除违规倾诉并限制滥用会话。
            </p>
          </section>
          <section>
            <h2 className="text-snow font-semibold text-base mb-2">免责声明</h2>
            <p>
              在法律允许范围内，服务按「现状」提供。音频会过期删除，请勿将 YellOut 作为重要记忆的存档。
            </p>
          </section>
        </div>
      )}

      <p className="mt-10 text-xs">
        <Link to="/about" className="text-amber hover:underline">
          关于
        </Link>
        {' · '}
        <Link to="/" className="text-amber hover:underline">
          返回树洞
        </Link>
      </p>
    </article>
  );
}
