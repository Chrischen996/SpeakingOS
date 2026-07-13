import Link from 'next/link';

type AppHeaderProps = {
  active: 'today' | 'practice';
};

export function AppHeader({ active }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link className="brand" href="/" aria-label="SpeakingOS home">
          <span className="brand__mark">SO</span>
          <span className="brand__name">SpeakingOS</span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          <Link className={active === 'today' ? 'primary-nav__link is-active' : 'primary-nav__link'} href="/">
            Today
          </Link>
          <Link
            className={active === 'practice' ? 'primary-nav__link is-active' : 'primary-nav__link'}
            href="/practice/session/new?questionId=11111111-1111-1111-1111-111111111111"
          >
            Practice
          </Link>
        </nav>

        <div className="profile-summary">
          <span className="profile-summary__label">Target</span>
          <strong>Band 7.0</strong>
          <span className="profile-summary__avatar" aria-hidden="true">D</span>
        </div>
      </div>
    </header>
  );
}
