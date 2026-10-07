/**
 * Profile networks with an icon in components/site/SocialIcon.tsx.
 *
 * In a module of its own, with no imports, because both site.ts and
 * validate.ts need it at load time: from either of those it would form an
 * import cycle in which validation could run before its constants exist.
 */
export const NETWORKS = ['email', 'linkedin', 'github', 'instagram'] as const;
export type Network = (typeof NETWORKS)[number];
