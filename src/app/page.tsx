'use client';

import { portfolio } from '@/content/portfolio';
import { useTheme } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Panel } from '@/components/Panel';
import { StarField } from '@/components/scene/StarField';
import { Clouds } from '@/components/scene/Clouds';
import { CelestialBody } from '@/components/scene/CelestialBody';
import { ShootingStars } from '@/components/scene/ShootingStars';
import { Ground } from '@/components/scene/Ground';

const { hero, about, experience, projects, contact, footer } = portfolio;

export default function Home() {
  const { theme } = useTheme();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Fixed to the top-right corner, but placed first in the DOM so keyboard
          users reach it right after the skip link rather than after the whole
          page. */}
      <ThemeToggle />

      <div className="scene">
        {/* Everything in here is decoration. */}
        <StarField />
        <Clouds />
        <CelestialBody />
        <ShootingStars theme={theme} />
        <div className="dither" aria-hidden="true" />
        <Ground />

        <header className="content">
          <div className="hero">
            <h1 className="hero-title">{hero.name}</h1>
            <p className="hero-tagline">{hero.tagline}</p>
            <p className="hero-hint" aria-hidden="true">
              ↓ SCROLL
            </p>
          </div>
        </header>

        <main id="main" className="content">
          <div className="sections">
            {/* Panels alternate left and right as you descend. */}
            <div className="section-row section-row--left">
              <Panel id="about" heading={about.heading}>
                {about.paragraphs.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
              </Panel>
            </div>

            <div className="section-row section-row--right">
              <Panel id="experience" heading={experience.heading}>
                {experience.entries.map((entry, i) => (
                  <div key={i}>
                    <p className="panel-subheading">
                      {entry.role} — {entry.company}
                    </p>
                    <p className="panel-meta">{entry.period}</p>
                    <ul>
                      {entry.bullets.map((bullet, j) => (
                        <li key={j}>{bullet}</li>
                      ))}
                    </ul>
                    <ul className="tags">
                      {entry.stack.map((tag) => (
                        <li className="tag" key={tag}>
                          {tag}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Panel>
            </div>

            <div className="section-row section-row--left">
              <Panel id="projects" heading={projects.heading}>
                {projects.entries.map((project) => (
                  <div className="project" key={project.name}>
                    <p className="panel-subheading">{project.name}</p>
                    <p>{project.blurb}</p>
                    <ul className="tags">
                      {project.stack.map((tag) => (
                        <li className="tag" key={tag}>
                          {tag}
                        </li>
                      ))}
                    </ul>
                    <a
                      className="project-link"
                      href={project.link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {project.link.label} →
                    </a>
                  </div>
                ))}
              </Panel>
            </div>

            <div className="section-row section-row--right">
              <Panel id="contact" heading={contact.heading}>
                <p>{contact.blurb}</p>
                <ul className="contact-list">
                  {contact.links.map((link) => (
                    <li key={link.label}>
                      <span className="contact-label">{link.label.toUpperCase()}</span>
                      <a href={link.href} rel="noopener noreferrer">
                        {link.display ?? link.href}
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </main>

        <footer className="site-footer">
          <p>{footer.note}</p>
        </footer>
      </div>
    </>
  );
}
