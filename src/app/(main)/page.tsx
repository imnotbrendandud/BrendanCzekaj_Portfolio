import { site, type Link } from '@/content/site';
import { SiteNav } from '@/components/site/SiteNav';
import { NETWORK_NAMES, SocialIcon } from '@/components/site/SocialIcon';

/** What the menu links to, in page order. */
const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
] as const;

/** External links open in a new tab; mailto and on-site links don't. */
function A({ link, className }: { link: Link; className?: string }) {
  const external = /^https?:\/\//i.test(link.href);
  return (
    <a
      className={className}
      href={link.href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {link.label}
    </a>
  );
}

/**
 * The main page: everything a recruiter needs, in the order they look for it.
 * Name, role and links first, then a summary, experience and projects, all on
 * one page with no tabs to click through.
 */
export default function Home() {
  return (
    <>
      {/* Drifting colour and a little grain behind everything (see site.css). */}
      <div className="backdrop" aria-hidden="true">
        <span className="aurora aurora--teal" />
        <span className="aurora aurora--cyan" />
        <span className="aurora aurora--green" />
      </div>

      <SiteNav sections={SECTIONS} extra={site.gamedev} />

      <main className="site">
        <div className="site-panel">
          <header className="site-header">
            <div className="site-intro">
              <h1>{site.name}</h1>
              <p className="site-headline">{site.headline}</p>
              <nav aria-label="Résumé and profiles">
                <ul className="site-socials">
                  {site.resume ? (
                    <li>
                      <a className="site-resume" href={site.resume}>
                        Résumé
                      </a>
                    </li>
                  ) : null}
                  {site.socials.map((social) => {
                    const name = NETWORK_NAMES[social.network];
                    const external = /^https?:\/\//i.test(social.href);
                    return (
                      <li key={social.network}>
                        <a
                          className="site-social"
                          href={social.href}
                          // Icons only on screen; the handle shows on hover and
                          // is read out by screen readers.
                          title={`${name}: ${social.handle}`}
                          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          <SocialIcon network={social.network} />
                          <span className="visually-hidden">
                            {name}: {social.handle}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
            {site.photo ? (
              // A plain <img>: the static export turns next/image's optimisation
              // off, so its component would only add JavaScript. The file in
              // public/ is already sized for the circle (400px, sharp at 2x).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="site-photo"
                src={site.photo.src}
                alt={site.photo.alt}
                width={168}
                height={168}
                decoding="async"
                // Above the fold: fetch it ahead of anything lower down.
                fetchPriority="high"
              />
            ) : null}
          </header>

          <section className="site-section" id="about" aria-labelledby="about-heading">
            <h2 id="about-heading">About</h2>
            <p className="site-summary">{site.summary}</p>
          </section>

          <section className="site-section" id="experience" aria-labelledby="experience-heading">
            <h2 id="experience-heading">Experience</h2>
            {site.experience.map((role) => (
              <article className="item" key={`${role.company}-${role.period}`}>
                <div className="item-head">
                  <h3>{role.title}</h3>
                  <p className="item-period">{role.period}</p>
                </div>
                <p className="item-sub">{role.company}</p>
                <ul className="item-bullets">
                  {role.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <ul className="stack" aria-label="Stack">
                  {role.stack.map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          <section className="site-section" id="projects" aria-labelledby="projects-heading">
            <h2 id="projects-heading">Projects</h2>
            {site.projects.map((project) => (
              <article className="item" key={project.name}>
                <div className="item-head">
                  <h3>{project.name}</h3>
                  {project.link ? <A className="item-link" link={project.link} /> : null}
                </div>
                <p className="item-text">{project.blurb}</p>
                <ul className="stack" aria-label="Stack">
                  {project.stack.map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          <footer className="site-footer">
            <p>{site.name}</p>
            <A link={site.gamedev} />
          </footer>
        </div>
      </main>
    </>
  );
}
