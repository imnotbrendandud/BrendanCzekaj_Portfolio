'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NETWORKS, type Network, type Site } from '@/content/site';
import { RichField } from '@/components/editor/RichField';
import { HrefField } from '@/components/editor/EditableBlocks';
import { moveItem, newId, type Draft } from '@/components/editor/model';
import { useEditorStore } from '@/components/editor/store';
import { NETWORK_NAMES, SocialIcon } from '@/components/site/SocialIcon';

type DraftSite = Draft<Site>;
type Owner = { stack: { id: string; text: string }[] };

/*
 * The main page with every field editable in place. The markup mirrors
 * SiteView so the page looks the same while you edit, with a few swaps:
 * elements that can't hold a block (<p>) become <div>s with the same class,
 * and lists get drag handles and add/remove controls.
 */

/* ===========================================================================
   Drag and drop
   Every sortable list names a `group`; SiteEditor only lets items land among
   their own group, then calls listFor() to reorder the matching array.
   =========================================================================== */

export function listFor(d: DraftSite, group: string): { id: string }[] | null {
  if (group === 'roles') return d.experience;
  if (group === 'projects') return d.projects;
  if (group === 'socials') return d.socials;
  const [kind, owner] = group.split(':');
  if (kind === 'bullets') return d.experience.find((r) => r.id === owner)?.bullets ?? null;
  if (kind === 'stack') {
    const holder: Owner | undefined =
      d.experience.find((r) => r.id === owner) ?? d.projects.find((p) => p.id === owner);
    return holder?.stack ?? null;
  }
  return null;
}

function useSortableRow(id: string, group: string) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { group } });
  return {
    rowRef: setNodeRef,
    style: { transform: CSS.Translate.toString(transform), transition } as CSSProperties,
    dragging: isDragging,
    handle: { ref: setActivatorNodeRef, ...attributes, ...listeners },
  };
}

function DragHandle({
  handle,
  label,
}: {
  handle: ReturnType<typeof useSortableRow>['handle'];
  label: string;
}) {
  return (
    <button
      type="button"
      className="ehandle"
      aria-label={`${label}. Space to pick up, arrow keys to move, Space to drop.`}
      title="Drag to reorder"
      {...handle}
    >
      ⋮⋮
    </button>
  );
}

/* ===========================================================================
   The page
   =========================================================================== */

export function EditableSite() {
  const { doc, update, focusField } = useEditorStore<Site>();

  const addRole = () => {
    const role = {
      id: newId('r'),
      title: '',
      company: '',
      period: '',
      bullets: [{ id: newId('i'), text: '' }],
      stack: [],
    };
    // Most recent first: a new role goes on top.
    update((d) => void d.experience.unshift(role));
    focusField(`${role.id}:title`, 'start');
  };

  const addProject = () => {
    const project = {
      id: newId('p'),
      name: '',
      blurb: '',
      stack: [],
      link: { label: '', href: '' },
    };
    update((d) => void d.projects.push(project));
    focusField(`${project.id}:name`, 'start');
  };

  return (
    <main className="site site--editing">
      <div className="site-panel">
        <header className="site-header">
          <div className="site-intro">
            <h1>
              <RichField
                fieldId="site:name"
                value={doc.name}
                placeholder="Your name"
                label="Name"
                onChange={(name) => update((d) => void (d.name = name), 'site:name')}
                onEnter={() => focusField('site:headline', 'start')}
              />
            </h1>
            <div className="site-headline">
              <RichField
                fieldId="site:headline"
                value={doc.headline}
                placeholder="Role and company"
                label="Headline"
                onChange={(headline) =>
                  update((d) => void (d.headline = headline), 'site:headline')
                }
              />
            </div>
            <EditableProfiles />
          </div>
          {doc.photo.src.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="site-photo"
              src={doc.photo.src}
              alt={doc.photo.alt}
              width={168}
              height={168}
              title="Change the photo under Page settings"
            />
          ) : null}
        </header>

        <section className="site-section" id="about" aria-labelledby="about-heading">
          <h2 id="about-heading">About</h2>
          <div className="site-summary">
            <RichField
              fieldId="site:summary"
              value={doc.summary}
              rich
              placeholder="A few sentences about you and the work you do."
              label="About"
              onChange={(summary) => update((d) => void (d.summary = summary), 'site:summary')}
            />
          </div>
        </section>

        <section className="site-section" id="experience" aria-labelledby="experience-heading">
          <h2 id="experience-heading">Experience</h2>
          <button type="button" className="eadd eadd--top" onClick={addRole}>
            ＋ Add role
          </button>
          <SortableContext
            items={doc.experience.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {doc.experience.map((role, i) => (
              <EditableRole key={role.id} index={i} count={doc.experience.length} role={role} />
            ))}
          </SortableContext>
        </section>

        <section className="site-section" id="projects" aria-labelledby="projects-heading">
          <h2 id="projects-heading">Projects</h2>
          <SortableContext
            items={doc.projects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {doc.projects.map((project, i) => (
              <EditableProject
                key={project.id}
                index={i}
                count={doc.projects.length}
                project={project}
              />
            ))}
          </SortableContext>
          <button type="button" className="eadd" onClick={addProject}>
            ＋ Add project
          </button>
        </section>

        <footer className="site-footer">
          <p>{doc.name}</p>
          {doc.gamedev.href.trim() ? (
            <span className="site-footer-link">{doc.gamedev.label}</span>
          ) : null}
        </footer>
      </div>
    </main>
  );
}

/* ===========================================================================
   Profiles and résumé
   =========================================================================== */

function EditableProfiles() {
  const { doc, update } = useEditorStore<Site>();

  const add = () => {
    const unused = NETWORKS.find((n) => !doc.socials.some((s) => s.network === n)) ?? 'email';
    update((d) => void d.socials.push({ id: newId('s'), network: unused, handle: '', href: '' }));
  };

  return (
    <div className="eprofiles">
      <SortableContext items={doc.socials.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul className="eprofile-list">
          {doc.socials.map((social, i) => (
            <EditableProfile key={social.id} index={i} />
          ))}
        </ul>
      </SortableContext>
      <button type="button" className="eadd" onClick={add}>
        ＋ Add profile
      </button>
      <label className="efield eresume">
        <span>Résumé PDF</span>
        <input
          type="text"
          value={doc.resume}
          spellCheck={false}
          placeholder="/resume.pdf (put the file in public/)"
          onChange={(e) => update((d) => void (d.resume = e.target.value), 'site:resume')}
        />
      </label>
    </div>
  );
}

function EditableProfile({ index }: { index: number }) {
  const { doc, update } = useEditorStore<Site>();
  const social = doc.socials[index]!;
  const { rowRef, style, dragging, handle } = useSortableRow(social.id, 'socials');
  const name = NETWORK_NAMES[social.network];

  const edit = (change: Partial<{ network: Network; handle: string; href: string }>, key: string) =>
    update((d) => {
      const s = d.socials.find((x) => x.id === social.id);
      if (s) Object.assign(s, change);
    }, key);

  return (
    <li ref={rowRef} style={style} className="eprofile" data-dragging={dragging}>
      <DragHandle handle={handle} label={`Move ${name} profile`} />
      <span className="eprofile-icon" aria-hidden="true">
        <SocialIcon network={social.network} />
      </span>
      <select
        aria-label="Network"
        value={social.network}
        onChange={(e) =>
          edit({ network: e.target.value as Network }, `social:${social.id}:network`)
        }
      >
        {NETWORKS.map((n) => (
          <option key={n} value={n}>
            {NETWORK_NAMES[n]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={social.handle}
        aria-label={`${name} handle`}
        placeholder="handle (shown on hover)"
        spellCheck={false}
        onChange={(e) => edit({ handle: e.target.value }, `social:${social.id}:handle`)}
      />
      <button
        type="button"
        className="eicon-button"
        data-danger
        aria-label={`Remove ${name} profile`}
        title="Remove"
        onClick={() => update((d) => void d.socials.splice(index, 1))}
      >
        ✕
      </button>
      <HrefField
        value={social.href}
        onChange={(href) => edit({ href }, `social:${social.id}:href`)}
      />
    </li>
  );
}

/* ===========================================================================
   Roles and projects
   =========================================================================== */

/** Hover toolbar for a role or project card. */
function ItemTools({
  group,
  index,
  count,
  label,
  onDuplicate,
}: {
  group: 'roles' | 'projects';
  index: number;
  count: number;
  label: string;
  onDuplicate: () => void;
}) {
  const { update } = useEditorStore<Site>();
  const list = (d: DraftSite) =>
    (group === 'roles' ? d.experience : d.projects) as { id: string }[];
  return (
    <div className="etools" role="group" aria-label={`${label} actions`}>
      <button
        type="button"
        title="Move up"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => update((d) => moveItem(list(d), index, index - 1))}
      >
        ↑
      </button>
      <button
        type="button"
        title="Move down"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => update((d) => moveItem(list(d), index, index + 1))}
      >
        ↓
      </button>
      <button
        type="button"
        title="Duplicate"
        aria-label={`Duplicate ${label}`}
        onClick={onDuplicate}
      >
        ⧉
      </button>
      <button
        type="button"
        title="Delete (⌘Z to undo)"
        aria-label={`Delete ${label}`}
        data-danger
        onClick={() => update((d) => void list(d).splice(index, 1))}
      >
        ✕
      </button>
    </div>
  );
}

/** A deep copy with fresh ids, so the duplicate is its own item. */
function withFreshIds<
  T extends { id: string; stack: { id: string }[]; bullets?: { id: string }[] },
>(item: T, prefix: string): T {
  const copy = structuredClone(item);
  copy.id = newId(prefix);
  copy.stack.forEach((t) => (t.id = newId('t')));
  copy.bullets?.forEach((b) => (b.id = newId('i')));
  return copy;
}

function EditableRole({
  role,
  index,
  count,
}: {
  role: Site['experience'][number];
  index: number;
  count: number;
}) {
  const { update, focusField } = useEditorStore<Site>();
  const { rowRef, style, dragging, handle } = useSortableRow(role.id, 'roles');
  const label = role.title || 'role';

  const edit = (field: 'title' | 'company' | 'period') => (value: string) =>
    update((d) => {
      const r = d.experience.find((x) => x.id === role.id);
      if (r) r[field] = value;
    }, `${role.id}:${field}`);

  return (
    <article ref={rowRef} style={style} className="item eitem" data-dragging={dragging}>
      <DragHandle handle={handle} label={`Move ${label}`} />
      <ItemTools
        group="roles"
        index={index}
        count={count}
        label={label}
        onDuplicate={() =>
          update(
            (d) => void d.experience.splice(index + 1, 0, withFreshIds(d.experience[index]!, 'r')),
          )
        }
      />
      <div className="item-head">
        <h3>
          <RichField
            fieldId={`${role.id}:title`}
            value={role.title}
            placeholder="Job title"
            label="Job title"
            onChange={edit('title')}
            onEnter={() => focusField(`${role.id}:company`, 'start')}
          />
        </h3>
        <div className="item-period">
          <RichField
            fieldId={`${role.id}:period`}
            value={role.period}
            placeholder="Start — End"
            label="Dates"
            onChange={edit('period')}
          />
        </div>
      </div>
      <div className="item-sub">
        <RichField
          fieldId={`${role.id}:company`}
          value={role.company}
          placeholder="Company"
          label="Company"
          onChange={edit('company')}
          onEnter={() => role.bullets[0] && focusField(role.bullets[0].id, 'start')}
        />
      </div>
      <EditableBullets role={role} />
      <EditableStack ownerId={role.id} tags={role.stack} />
    </article>
  );
}

function EditableProject({
  project,
  index,
  count,
}: {
  project: Site['projects'][number];
  index: number;
  count: number;
}) {
  const { update, focusField } = useEditorStore<Site>();
  const { rowRef, style, dragging, handle } = useSortableRow(project.id, 'projects');
  const label = project.name || 'project';

  const edit = (change: (p: DraftSite['projects'][number]) => void, key: string) =>
    update((d) => {
      const p = d.projects.find((x) => x.id === project.id);
      if (p) change(p);
    }, key);

  return (
    <article ref={rowRef} style={style} className="item eitem" data-dragging={dragging}>
      <DragHandle handle={handle} label={`Move ${label}`} />
      <ItemTools
        group="projects"
        index={index}
        count={count}
        label={label}
        onDuplicate={() =>
          update((d) => void d.projects.splice(index + 1, 0, withFreshIds(d.projects[index]!, 'p')))
        }
      />
      <div className="item-head">
        <h3>
          <RichField
            fieldId={`${project.id}:name`}
            value={project.name}
            placeholder="Project name"
            label="Project name"
            onChange={(name) => edit((p) => void (p.name = name), `${project.id}:name`)}
            onEnter={() => focusField(`${project.id}:blurb`, 'start')}
          />
        </h3>
        <div className="item-link elink">
          <RichField
            fieldId={`${project.id}:link`}
            value={project.link.label}
            placeholder="Link label"
            label="Link label"
            onChange={(text) => edit((p) => void (p.link.label = text), `${project.id}:linklabel`)}
          />
        </div>
      </div>
      <HrefField
        value={project.link.href}
        onChange={(href) => edit((p) => void (p.link.href = href), `${project.id}:linkhref`)}
      />
      <div className="item-text">
        <RichField
          fieldId={`${project.id}:blurb`}
          value={project.blurb}
          rich
          placeholder="What it is, and what's interesting about it."
          label="Project description"
          onChange={(blurb) => edit((p) => void (p.blurb = blurb), `${project.id}:blurb`)}
        />
      </div>
      <EditableStack ownerId={project.id} tags={project.stack} />
    </article>
  );
}

/* ===========================================================================
   Bullets and stack chips
   =========================================================================== */

function EditableBullets({ role }: { role: Site['experience'][number] }) {
  const { update, focusField } = useEditorStore<Site>();
  const group = `bullets:${role.id}`;

  const editBullets = (change: (bullets: { id: string; text: string }[]) => void, key?: string) =>
    update((d) => {
      const r = d.experience.find((x) => x.id === role.id);
      if (r) change(r.bullets);
    }, key);

  const addAfter = (index: number) => {
    const bullet = { id: newId('i'), text: '' };
    editBullets((bullets) => void bullets.splice(index + 1, 0, bullet));
    focusField(bullet.id, 'start');
  };

  const removeAt = (index: number) => {
    const previous = role.bullets[index - 1];
    editBullets((bullets) => void bullets.splice(index, 1));
    focusField(previous ? previous.id : `${role.id}:company`, 'end');
  };

  return (
    <>
      <SortableContext items={role.bullets.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <ul className="item-bullets">
          {role.bullets.map((bullet, i) => (
            <SortableRow key={bullet.id} id={bullet.id} group={group} label="bullet">
              <RichField
                fieldId={bullet.id}
                value={bullet.text}
                rich
                placeholder="What you did, and what came of it."
                label={`Bullet ${i + 1}`}
                onChange={(text) =>
                  editBullets((bullets) => {
                    const b = bullets.find((x) => x.id === bullet.id);
                    if (b) b.text = text;
                  }, `text:${bullet.id}`)
                }
                onEnter={() => addAfter(i)}
                onBackspaceEmpty={() => removeAt(i)}
              />
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
      <button
        type="button"
        className="eadd eadd--inline"
        onClick={() => addAfter(role.bullets.length - 1)}
      >
        ＋ Bullet
      </button>
    </>
  );
}

function EditableStack({
  ownerId,
  tags,
}: {
  ownerId: string;
  tags: readonly { id: string; text: string }[];
}) {
  const { update, focusField } = useEditorStore<Site>();
  const group = `stack:${ownerId}`;

  const editTags = (change: (stack: { id: string; text: string }[]) => void, key?: string) =>
    update((d) => {
      const holder: Owner | undefined =
        d.experience.find((r) => r.id === ownerId) ?? d.projects.find((p) => p.id === ownerId);
      if (holder) change(holder.stack);
    }, key);

  const addAfter = (index: number) => {
    const tag = { id: newId('t'), text: '' };
    editTags((stack) => void stack.splice(index + 1, 0, tag));
    focusField(tag.id, 'start');
  };

  const removeAt = (index: number, refocus: boolean) => {
    const previous = tags[index - 1];
    editTags((stack) => void stack.splice(index, 1));
    if (refocus && previous) focusField(previous.id, 'end');
  };

  return (
    <SortableContext items={tags.map((t) => t.id)} strategy={rectSortingStrategy}>
      <ul className="stack stack--editing" aria-label="Stack">
        {tags.map((tag, i) => (
          <SortableRow key={tag.id} id={tag.id} group={group} label="tag" className="etag">
            <RichField
              fieldId={tag.id}
              value={tag.text}
              placeholder="Tech"
              label={`Stack item ${i + 1}`}
              onChange={(text) =>
                editTags((stack) => {
                  const t = stack.find((x) => x.id === tag.id);
                  if (t) t.text = text;
                }, `text:${tag.id}`)
              }
              onEnter={() => addAfter(i)}
              onBackspaceEmpty={() => removeAt(i, true)}
            />
            <button
              type="button"
              className="etag-remove"
              aria-label={`Remove ${tag.text || 'tag'}`}
              title="Remove"
              onClick={() => removeAt(i, false)}
            >
              ×
            </button>
          </SortableRow>
        ))}
        <li className="etag-add">
          <button
            type="button"
            aria-label="Add to stack"
            title="Add to stack"
            onClick={() => addAfter(tags.length - 1)}
          >
            ＋
          </button>
        </li>
      </ul>
    </SortableContext>
  );
}

function SortableRow({
  id,
  group,
  label,
  className,
  children,
}: {
  id: string;
  group: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { rowRef, style, dragging, handle } = useSortableRow(id, group);
  return (
    <li ref={rowRef} style={style} className={`erow ${className ?? ''}`} data-dragging={dragging}>
      <DragHandle handle={handle} label={`Move ${label}`} />
      {children}
    </li>
  );
}
