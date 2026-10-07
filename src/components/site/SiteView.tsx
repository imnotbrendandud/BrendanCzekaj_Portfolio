import type { Link, Site } from '@/content/site';
import { Inline } from '@/components/content/Inline';
import { NETWORK_NAMES, SocialIcon } from './SocialIcon';

/** External links open in a new tab; mailto and on-site links don't. */
export function externalProps(href: string) {
  return /^https?:\/\//i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

function A({ link, className }: { link: Link; className?: string }) {
  return (
    <a className={className} href={link.href} {...externalProps(link.href)}>
      {link.label}
    </a>
  );
}

const filled = (text: string) => text.trim() !== '';

/**
 * The main page's content, read-only: everything a recruiter needs, in the
 * order they look for it. Name, role and links first, then a summary,
 * experience and projects, all on one page with no tabs to click through.
 *
 * Unfinished drafts are left out rather than shown half-done: an empty bullet,
 * tag, link or role doesn't render.
 */
export function SiteView({ site }: { site: Site }) {
  const roles = site.experience.filter((role) => filled(role.title) || filled(role.company));
  const projects = site.projects.filter((project) => filled(project.name));
  const socials = site.socials.filter((social) => filled(social.href));

  return (
    <main className="site">
      <div className="site-panel">
        <header className="site-header">
          <div className="site-intro">
            <h1>{site.name}</h1>
            <p className="site-headline">{site.headline}</p>
            <nav aria-label="Résumé and profiles">
              <ul className="site-socials">
                {filled(site.resume) ? (
                  <li>
                    <a className="site-resume" href={site.resume}>
                      Résumé
                    </a>
                  </li>
                ) : null}
                {socials.map((social) => {
                  const name = NETWORK_NAMES[social.network];
                  return (
                    <li key={social.id}>
                      <a
                        className="site-social"
                        href={social.href}
                        // Icons only on screen; the handle shows on hover and
                        // is read out by screen readers.
                        title={`${name}: ${social.handle}`}
                        {...externalProps(social.href)}
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
          {filled(site.photo.src) ? (
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
          <p className="site-summary">
            <Inline text={site.summary} />
          </p>
        </section>

        <section className="site-section" id="experience" aria-labelledby="experience-heading">
          <h2 id="experience-heading">Experience</h2>
          {roles.map((role) => (
            <article className="item" key={role.id}>
              <div className="item-head">
                <h3>{role.title}</h3>
                <p className="item-period">{role.period}</p>
              </div>
              <p className="item-sub">{role.company}</p>
              <ul className="item-bullets">
                {role.bullets
                  .filter((bullet) => filled(bullet.text))
                  .map((bullet) => (
                    <li key={bullet.id}>
                      <Inline text={bullet.text} />
                    </li>
                  ))}
              </ul>
              <Stack tags={role.stack} />
            </article>
          ))}
        </section>

        <section className="site-section" id="projects" aria-labelledby="projects-heading">
          <h2 id="projects-heading">Projects</h2>
          {projects.map((project) => (
            <article className="item" key={project.id}>
              <div className="item-head">
                <h3>{project.name}</h3>
                {filled(project.link.href) && filled(project.link.label) ? (
                  <A className="item-link" link={project.link} />
                ) : null}
              </div>
              <p className="item-text">
                <Inline text={project.blurb} />
              </p>
              <Stack tags={project.stack} />
            </article>
          ))}
        </section>

        <footer className="site-footer">
          <p>{site.name}</p>
          {filled(site.gamedev.href) ? <A link={site.gamedev} /> : null}
        </footer>
      </div>
    </main>
  );
}

function Stack({ tags }: { tags: Site['projects'][number]['stack'] }) {
  const shown = tags.filter((tag) => filled(tag.text));
  if (shown.length === 0) return null;
  return (
    <ul className="stack" aria-label="Stack">
      {shown.map((tag) => (
        <li key={tag.id}>{tag.text}</li>
      ))}
    </ul>
  );
}
